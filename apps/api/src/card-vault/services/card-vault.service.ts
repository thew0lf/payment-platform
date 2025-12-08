import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialEncryptionService } from '../../integrations/services/credential-encryption.service';
import { CardVaultStatus, CardVaultProvider, CardType, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

export interface StoreCardDto {
  companyId: string;
  customerId?: string;      // Optional - can store for guest checkout
  sessionToken?: string;    // For funnel session linking
  cardNumber: string;
  cvv: string;
  expirationMonth: number;
  expirationYear: number;
  cardholderName?: string;
  billingAddress?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  nickname?: string;
}

export interface VaultCardDto {
  encryptedCardId: string;
  customerId: string;
  provider: CardVaultProvider;
  providerToken: string;
  providerCustomerId?: string;
  isDefault?: boolean;
}

export interface ChargeStoredCardDto {
  cardVaultId: string;
  amount: number;
  currency?: string;
  orderId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

// Internal type for decrypted card data
interface DecryptedCardData {
  cardNumber: string;
  cvv: string;
  expirationMonth: number;
  expirationYear: number;
  cardholderName?: string;
  billingAddress?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

@Injectable()
export class CardVaultService {
  private readonly logger = new Logger(CardVaultService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: CredentialEncryptionService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // TEMPORARY ENCRYPTED STORAGE
  // For storing cards during checkout before tokenization
  // ═══════════════════════════════════════════════════════════════

  async storeCardTemporarily(dto: StoreCardDto) {
    // Validate card number (basic Luhn check)
    if (!this.validateCardNumber(dto.cardNumber)) {
      throw new BadRequestException('Invalid card number');
    }

    // Detect card type
    const cardType = this.detectCardType(dto.cardNumber);

    // Create fingerprint for deduplication
    const cardFingerprint = this.createCardFingerprint(dto.cardNumber);

    // Encrypt sensitive card data
    const sensitiveData = {
      cardNumber: dto.cardNumber,
      cvv: dto.cvv,
      expirationMonth: dto.expirationMonth,
      expirationYear: dto.expirationYear,
      cardholderName: dto.cardholderName,
      billingAddress: dto.billingAddress,
    };

    const encryptedResult = this.encryptionService.encrypt(sensitiveData);
    const encryptedData = JSON.stringify(encryptedResult);

    // Set expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const encryptedCard = await this.prisma.encryptedCard.create({
      data: {
        companyId: dto.companyId,
        sessionToken: dto.sessionToken,
        encryptedData,
        cardFingerprint,
        expiresAt,
      },
    });

    // Return safe info for frontend
    return {
      id: encryptedCard.id,
      cardType,
      lastFour: dto.cardNumber.slice(-4),
      expiresAt,
    };
  }

  async getEncryptedCard(encryptedCardId: string) {
    const card = await this.prisma.encryptedCard.findUnique({
      where: { id: encryptedCardId },
    });

    if (!card) {
      throw new NotFoundException('Encrypted card not found');
    }

    if (card.status !== 'pending') {
      throw new BadRequestException('Card has already been processed or expired');
    }

    if (new Date() > card.expiresAt) {
      await this.markEncryptedCardExpired(encryptedCardId);
      throw new BadRequestException('Card has expired');
    }

    // Decrypt the card data
    const encryptedCredentials = JSON.parse(card.encryptedData);
    const decryptedData = this.encryptionService.decrypt(encryptedCredentials) as unknown as DecryptedCardData;
    return {
      ...card,
      decryptedData,
    };
  }

  async markEncryptedCardProcessed(encryptedCardId: string, vaultId?: string) {
    return this.prisma.encryptedCard.update({
      where: { id: encryptedCardId },
      data: {
        status: 'processed',
        processedAt: new Date(),
        migratedToVaultId: vaultId,
      },
    });
  }

  async markEncryptedCardExpired(encryptedCardId: string) {
    return this.prisma.encryptedCard.update({
      where: { id: encryptedCardId },
      data: { status: 'expired' },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CARD VAULT MANAGEMENT
  // For long-term tokenized storage via payment providers
  // ═══════════════════════════════════════════════════════════════

  async createVaultFromEncrypted(dto: VaultCardDto) {
    // Get the encrypted card
    const encryptedCard = await this.getEncryptedCard(dto.encryptedCardId);
    const cardData = encryptedCard.decryptedData;

    // Create the vault entry
    const vault = await this.prisma.cardVault.create({
      data: {
        companyId: encryptedCard.companyId,
        customerId: dto.customerId,
        provider: dto.provider,
        providerToken: dto.providerToken,
        providerCustomerId: dto.providerCustomerId,
        cardType: this.detectCardType(cardData.cardNumber),
        lastFour: cardData.cardNumber.slice(-4),
        cardholderName: cardData.cardholderName,
        expirationMonth: cardData.expirationMonth,
        expirationYear: cardData.expirationYear,
        billingAddress: cardData.billingAddress as Prisma.InputJsonValue,
        status: CardVaultStatus.ACTIVE,
        isDefault: dto.isDefault ?? false,
      },
    });

    // Mark encrypted card as processed
    await this.markEncryptedCardProcessed(dto.encryptedCardId, vault.id);

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.cardVault.updateMany({
        where: {
          customerId: dto.customerId,
          id: { not: vault.id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    this.logger.log(`Card vaulted for customer ${dto.customerId} via ${dto.provider}`);

    return vault;
  }

  async getCustomerCards(customerId: string) {
    return this.prisma.cardVault.findMany({
      where: {
        customerId,
        status: { in: [CardVaultStatus.ACTIVE, CardVaultStatus.PENDING] },
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getCardById(cardVaultId: string) {
    const card = await this.prisma.cardVault.findUnique({
      where: { id: cardVaultId },
      include: {
        customer: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!card || card.deletedAt) {
      throw new NotFoundException('Card not found');
    }

    return card;
  }

  async setDefaultCard(customerId: string, cardVaultId: string) {
    // Verify card belongs to customer
    const card = await this.prisma.cardVault.findFirst({
      where: {
        id: cardVaultId,
        customerId,
        deletedAt: null,
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    // Unset other defaults
    await this.prisma.cardVault.updateMany({
      where: {
        customerId,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.cardVault.update({
      where: { id: cardVaultId },
      data: { isDefault: true },
    });
  }

  async deleteCard(cardVaultId: string, deletedBy: string) {
    const card = await this.getCardById(cardVaultId);

    return this.prisma.cardVault.update({
      where: { id: cardVaultId },
      data: {
        status: CardVaultStatus.REVOKED,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async updateCardExpiration(cardVaultId: string, month: number, year: number) {
    return this.prisma.cardVault.update({
      where: { id: cardVaultId },
      data: {
        expirationMonth: month,
        expirationYear: year,
        status: CardVaultStatus.ACTIVE, // Reactivate if was expired
        expirationAlertSent: false,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSACTION RECORDING
  // ═══════════════════════════════════════════════════════════════

  async recordTransaction(
    cardVaultId: string,
    data: {
      success: boolean;
      amount: number;
      currency: string;
      type: string;
      transactionId?: string;
      orderId?: string;
      source?: string;
      errorCode?: string;
      errorMessage?: string;
      providerResponse?: Record<string, unknown>;
    },
  ) {
    // Create transaction record
    const transaction = await this.prisma.cardVaultTransaction.create({
      data: {
        cardVaultId,
        success: data.success,
        amount: data.amount,
        currency: data.currency,
        type: data.type,
        transactionId: data.transactionId,
        orderId: data.orderId,
        source: data.source,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        providerResponse: data.providerResponse as Prisma.InputJsonValue,
      },
    });

    // Update card stats
    if (data.success) {
      await this.prisma.cardVault.update({
        where: { id: cardVaultId },
        data: {
          lastUsedAt: new Date(),
          successfulUses: { increment: 1 },
        },
      });
    } else {
      await this.prisma.cardVault.update({
        where: { id: cardVaultId },
        data: {
          failedUses: { increment: 1 },
          lastFailureReason: data.errorMessage || data.errorCode,
        },
      });

      // Check if card should be disabled
      const card = await this.prisma.cardVault.findUnique({
        where: { id: cardVaultId },
      });

      if (card && card.failedUses >= 3) {
        await this.prisma.cardVault.update({
          where: { id: cardVaultId },
          data: { status: CardVaultStatus.FAILED },
        });
        this.logger.warn(`Card ${cardVaultId} disabled due to repeated failures`);
      }
    }

    return transaction;
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPIRATION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async findExpiringCards(daysAhead: number = 30) {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + Math.ceil(daysAhead / 30), 1);

    return this.prisma.cardVault.findMany({
      where: {
        status: CardVaultStatus.ACTIVE,
        deletedAt: null,
        expirationAlertSent: false,
        OR: [
          // Expires this month or next
          {
            expirationYear: targetDate.getFullYear(),
            expirationMonth: { lte: targetDate.getMonth() + 1 },
          },
          // Already expired
          {
            expirationYear: { lt: now.getFullYear() },
          },
          {
            expirationYear: now.getFullYear(),
            expirationMonth: { lt: now.getMonth() + 1 },
          },
        ],
      },
      include: {
        customer: { select: { email: true, firstName: true } },
      },
    });
  }

  async markExpirationAlertSent(cardVaultId: string) {
    return this.prisma.cardVault.update({
      where: { id: cardVaultId },
      data: {
        expirationAlertSent: true,
        expirationAlertAt: new Date(),
      },
    });
  }

  async markCardsExpired() {
    const now = new Date();

    return this.prisma.cardVault.updateMany({
      where: {
        status: CardVaultStatus.ACTIVE,
        OR: [
          { expirationYear: { lt: now.getFullYear() } },
          {
            expirationYear: now.getFullYear(),
            expirationMonth: { lt: now.getMonth() + 1 },
          },
        ],
      },
      data: { status: CardVaultStatus.EXPIRED },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════

  async cleanupExpiredEncryptedCards() {
    const result = await this.prisma.encryptedCard.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    });

    this.logger.log(`Cleaned up ${result.count} expired encrypted cards`);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  private validateCardNumber(cardNumber: string): boolean {
    // Remove spaces and dashes
    const cleaned = cardNumber.replace(/[\s-]/g, '');

    // Check if only digits
    if (!/^\d+$/.test(cleaned)) return false;

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  private detectCardType(cardNumber: string): CardType {
    const cleaned = cardNumber.replace(/[\s-]/g, '');

    // Visa: starts with 4
    if (/^4/.test(cleaned)) return CardType.VISA;

    // Mastercard: 51-55 or 2221-2720
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return CardType.MASTERCARD;

    // Amex: 34 or 37
    if (/^3[47]/.test(cleaned)) return CardType.AMEX;

    // Discover: 6011, 622126-622925, 644-649, 65
    if (/^6011|^65|^64[4-9]|^622/.test(cleaned)) return CardType.DISCOVER;

    // Diners Club: 300-305, 36, 38
    if (/^3(?:0[0-5]|[68])/.test(cleaned)) return CardType.DINERS;

    // JCB: 3528-3589
    if (/^35/.test(cleaned)) return CardType.JCB;

    // UnionPay: 62
    if (/^62/.test(cleaned)) return CardType.UNIONPAY;

    return CardType.OTHER;
  }

  private createCardFingerprint(cardNumber: string): string {
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    return createHash('sha256').update(cleaned).digest('hex');
  }
}
