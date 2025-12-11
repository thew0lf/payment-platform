import {
  Controller,
  Post,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CardVaultService } from '../services/card-vault.service';
import { CardVaultProvider } from '@prisma/client';

interface MyCardsDto {
  email: string;
  companyCode: string; // Required for tenant isolation
}

interface AddCardDto {
  email: string;
  companyCode: string; // Required for tenant isolation
  card: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName?: string;
  };
  nickname?: string;
  setAsDefault?: boolean;
}

interface DeleteCardDto {
  email: string;
  companyCode: string; // Required for tenant isolation
  paymentMethodId: string;
}

interface SetDefaultDto {
  email: string;
  companyCode: string; // Required for tenant isolation
  paymentMethodId: string;
}

@Controller('card-vault/public')
export class CardVaultPublicController {
  constructor(
    private prisma: PrismaService,
    private cardVaultService: CardVaultService,
  ) {}

  /**
   * Resolve company from companyCode
   * @private
   */
  private async resolveCompany(companyCode: string) {
    if (!companyCode) {
      throw new BadRequestException('Company code is required');
    }

    const company = await this.prisma.company.findFirst({
      where: {
        code: companyCode.toUpperCase(),
        deletedAt: null,
      },
    });

    if (!company) {
      throw new BadRequestException('Invalid company code');
    }

    return company;
  }

  /**
   * Get customer's saved payment methods
   * POST /api/card-vault/public/my-cards
   */
  @Post('my-cards')
  async getMyCards(@Body() dto: MyCardsDto) {
    if (!dto.email) {
      throw new BadRequestException('Email is required');
    }

    // Resolve company for tenant isolation
    const company = await this.resolveCompany(dto.companyCode);

    // Find customer by email within this company only
    const customer = await this.prisma.customer.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        companyId: company.id, // Tenant isolation
        deletedAt: null,
      },
    });

    if (!customer) {
      return { paymentMethods: [], total: 0 };
    }

    // Get their saved cards
    const cards = await this.cardVaultService.getCustomerCards(customer.id);

    return {
      paymentMethods: cards.map((card) => ({
        id: card.id,
        cardType: card.cardType,
        lastFour: card.lastFour,
        expirationMonth: card.expirationMonth,
        expirationYear: card.expirationYear,
        cardholderName: card.cardholderName,
        nickname: (card as any).nickname || null,
        isDefault: card.isDefault,
        createdAt: card.createdAt.toISOString(),
      })),
      total: cards.length,
    };
  }

  /**
   * Add a new payment method
   * POST /api/card-vault/public/add
   */
  @Post('add')
  async addCard(@Body() dto: AddCardDto) {
    if (!dto.email || !dto.card) {
      throw new BadRequestException('Email and card details are required');
    }

    // Resolve company for tenant isolation
    const company = await this.resolveCompany(dto.companyCode);

    // Find customer by email within this company only
    const customer = await this.prisma.customer.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        companyId: company.id, // Tenant isolation
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Store card temporarily
    const tempCard = await this.cardVaultService.storeCardTemporarily({
      companyId: customer.companyId,
      customerId: customer.id,
      cardNumber: dto.card.number,
      cvv: dto.card.cvv,
      expirationMonth: parseInt(dto.card.expiryMonth, 10),
      expirationYear: parseInt(dto.card.expiryYear, 10),
      cardholderName: dto.card.cardholderName,
      nickname: dto.nickname,
    });

    // Create vault entry (in real implementation, this would tokenize with payment provider)
    const vault = await this.cardVaultService.createVaultFromEncrypted({
      encryptedCardId: tempCard.id,
      customerId: customer.id,
      provider: CardVaultProvider.INTERNAL,
      providerToken: `vault_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      isDefault: dto.setAsDefault,
    });

    return {
      id: vault.id,
      cardType: vault.cardType,
      lastFour: vault.lastFour,
      expirationMonth: vault.expirationMonth,
      expirationYear: vault.expirationYear,
      cardholderName: vault.cardholderName,
      nickname: dto.nickname || null,
      isDefault: vault.isDefault,
      createdAt: vault.createdAt.toISOString(),
    };
  }

  /**
   * Delete a payment method
   * POST /api/card-vault/public/delete
   */
  @Post('delete')
  async deleteCard(@Body() dto: DeleteCardDto) {
    if (!dto.email || !dto.paymentMethodId) {
      throw new BadRequestException('Email and payment method ID are required');
    }

    // Resolve company for tenant isolation
    const company = await this.resolveCompany(dto.companyCode);

    // Find customer by email within this company only
    const customer = await this.prisma.customer.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        companyId: company.id, // Tenant isolation
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify card belongs to customer
    const card = await this.prisma.cardVault.findFirst({
      where: {
        id: dto.paymentMethodId,
        customerId: customer.id,
        deletedAt: null,
      },
    });

    if (!card) {
      throw new NotFoundException('Payment method not found');
    }

    // Delete the card
    await this.cardVaultService.deleteCard(dto.paymentMethodId, customer.id);

    return { success: true };
  }

  /**
   * Set a payment method as default
   * POST /api/card-vault/public/set-default
   */
  @Post('set-default')
  async setDefault(@Body() dto: SetDefaultDto) {
    if (!dto.email || !dto.paymentMethodId) {
      throw new BadRequestException('Email and payment method ID are required');
    }

    // Resolve company for tenant isolation
    const company = await this.resolveCompany(dto.companyCode);

    // Find customer by email within this company only
    const customer = await this.prisma.customer.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        companyId: company.id, // Tenant isolation
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Verify card belongs to customer
    const card = await this.prisma.cardVault.findFirst({
      where: {
        id: dto.paymentMethodId,
        customerId: customer.id,
        deletedAt: null,
      },
    });

    if (!card) {
      throw new NotFoundException('Payment method not found');
    }

    // Set as default
    const updated = await this.cardVaultService.setDefaultCard(customer.id, dto.paymentMethodId);

    return {
      id: updated.id,
      cardType: updated.cardType,
      lastFour: updated.lastFour,
      expirationMonth: updated.expirationMonth,
      expirationYear: updated.expirationYear,
      cardholderName: updated.cardholderName,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
