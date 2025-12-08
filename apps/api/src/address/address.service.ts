import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GooglePlacesService, GooglePlacesCredentials, GooglePlacesSettings, AutocompleteResult, PlaceDetailsResult } from '../integrations/services/providers/google-places.service';
import { CredentialEncryptionService } from '../integrations/services/credential-encryption.service';
import { IntegrationProvider, IntegrationStatus, IntegrationMode } from '../integrations/types/integration.types';

interface AddressIntegrationContext {
  integration: {
    id: string;
    mode: string;
    platformIntegrationId?: string | null;
  };
  credentials: GooglePlacesCredentials;
  isCompanyOwned: boolean;
}

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googlePlacesService: GooglePlacesService,
    private readonly encryptionService: CredentialEncryptionService,
  ) {}

  /**
   * Get the Google Places integration for a company
   * First checks for company-owned integration, then falls back to platform
   */
  async getAddressIntegration(companyId: string): Promise<AddressIntegrationContext | null> {
    // Get company to find clientId
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, clientId: true, client: { select: { organizationId: true } } },
    });

    if (!company) {
      throw new NotFoundException(`Company not found: ${companyId}`);
    }

    // Check for client integration (company-owned or platform)
    const clientIntegration = await this.prisma.clientIntegration.findFirst({
      where: {
        clientId: company.clientId,
        provider: IntegrationProvider.GOOGLE_PLACES,
        status: IntegrationStatus.ACTIVE,
      },
      orderBy: { isDefault: 'desc' },
    });

    if (clientIntegration) {
      let credentials: GooglePlacesCredentials;
      const isCompanyOwned = clientIntegration.mode === IntegrationMode.OWN;

      if (isCompanyOwned) {
        // Decrypt company's own credentials
        credentials = this.encryptionService.decrypt(clientIntegration.credentials as any) as GooglePlacesCredentials;
      } else {
        // Get platform credentials
        if (!clientIntegration.platformIntegrationId) {
          throw new BadRequestException('Platform integration not configured');
        }
        const platformIntegration = await this.prisma.platformIntegration.findUnique({
          where: { id: clientIntegration.platformIntegrationId },
        });
        if (!platformIntegration) {
          throw new NotFoundException('Platform integration not found');
        }
        credentials = this.encryptionService.decrypt(platformIntegration.credentials as any) as GooglePlacesCredentials;
      }

      return {
        integration: {
          id: clientIntegration.id,
          mode: clientIntegration.mode,
          platformIntegrationId: clientIntegration.platformIntegrationId,
        },
        credentials,
        isCompanyOwned,
      };
    }

    // Check for direct platform integration (shared with all clients)
    const platformIntegration = await this.prisma.platformIntegration.findFirst({
      where: {
        organizationId: company.client.organizationId,
        provider: IntegrationProvider.GOOGLE_PLACES,
        status: IntegrationStatus.ACTIVE,
        isSharedWithClients: true,
      },
    });

    if (platformIntegration) {
      const credentials = this.encryptionService.decrypt(platformIntegration.credentials as any) as GooglePlacesCredentials;
      return {
        integration: {
          id: platformIntegration.id,
          mode: IntegrationMode.PLATFORM,
          platformIntegrationId: platformIntegration.id,
        },
        credentials,
        isCompanyOwned: false,
      };
    }

    return null;
  }

  /**
   * Track API usage for billing
   */
  async trackUsage(
    companyId: string,
    clientId: string,
    integrationContext: AddressIntegrationContext,
    usageType: 'autocomplete' | 'place_details',
    sessionToken: string,
    endpoint: string,
    responseCode: number,
  ): Promise<void> {
    // Google Places API pricing (as of 2024):
    // - Autocomplete per Request: $2.83 per 1000 requests
    // - Place Details (Address): $17.00 per 1000 requests
    const baseCostCents = usageType === 'autocomplete' ? 0.283 : 1.7; // Cost in cents per request
    const markupPercent = integrationContext.isCompanyOwned ? 0 : 40; // 40% markup on platform
    const billableCents = baseCostCents * (1 + markupPercent / 100);

    const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

    await this.prisma.integrationUsage.create({
      data: {
        companyId,
        clientId,
        provider: IntegrationProvider.GOOGLE_PLACES,
        clientIntegrationId: integrationContext.integration.mode === IntegrationMode.OWN ? integrationContext.integration.id : null,
        platformIntegrationId: integrationContext.integration.platformIntegrationId || null,
        usageType,
        sessionToken,
        requestCount: 1,
        baseCostCents: Math.round(baseCostCents * 100) / 100, // Store as cents with 2 decimal places
        markupPercent,
        billableCents: Math.round(billableCents * 100) / 100,
        currency: 'USD',
        billingPeriod,
        endpoint,
        responseCode,
        metadata: {},
      },
    });

    this.logger.debug(`Tracked ${usageType} usage for company ${companyId}`);
  }

  /**
   * Get address autocomplete predictions
   */
  async autocomplete(
    companyId: string,
    input: string,
    sessionToken: string,
    countries?: string[],
  ): Promise<AutocompleteResult> {
    const context = await this.getAddressIntegration(companyId);
    if (!context) {
      throw new BadRequestException('Google Places integration not configured');
    }

    // Get company to find clientId for tracking
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    const settings: GooglePlacesSettings = {};
    if (countries && countries.length > 0) {
      settings.restrictToCountries = countries;
    }

    try {
      const result = await this.googlePlacesService.autocomplete(
        context.credentials,
        input,
        sessionToken,
        settings,
      );

      // Track usage
      await this.trackUsage(
        companyId,
        company!.clientId,
        context,
        'autocomplete',
        sessionToken,
        '/place/autocomplete/json',
        200,
      );

      return result;
    } catch (error) {
      // Track failed request
      await this.trackUsage(
        companyId,
        company!.clientId,
        context,
        'autocomplete',
        sessionToken,
        '/place/autocomplete/json',
        500,
      );
      throw error;
    }
  }

  /**
   * Get full address details for a place ID
   */
  async getPlaceDetails(
    companyId: string,
    placeId: string,
    sessionToken: string,
  ): Promise<PlaceDetailsResult> {
    const context = await this.getAddressIntegration(companyId);
    if (!context) {
      throw new BadRequestException('Google Places integration not configured');
    }

    // Get company to find clientId for tracking
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { clientId: true },
    });

    try {
      const result = await this.googlePlacesService.getPlaceDetails(
        context.credentials,
        placeId,
        sessionToken,
      );

      // Track usage
      await this.trackUsage(
        companyId,
        company!.clientId,
        context,
        'place_details',
        sessionToken,
        '/place/details/json',
        200,
      );

      return result;
    } catch (error) {
      // Track failed request
      await this.trackUsage(
        companyId,
        company!.clientId,
        context,
        'place_details',
        sessionToken,
        '/place/details/json',
        500,
      );
      throw error;
    }
  }

  /**
   * Get usage statistics for a company
   */
  async getUsageStats(
    companyId: string,
    billingPeriod?: string,
  ): Promise<{
    totalRequests: number;
    autocompleteRequests: number;
    placeDetailsRequests: number;
    totalCostCents: number;
    totalBillableCents: number;
    billingPeriod: string;
  }> {
    const period = billingPeriod || new Date().toISOString().slice(0, 7);

    const usage = await this.prisma.integrationUsage.findMany({
      where: {
        companyId,
        provider: IntegrationProvider.GOOGLE_PLACES,
        billingPeriod: period,
      },
    });

    const autocompleteRequests = usage.filter(u => u.usageType === 'autocomplete').length;
    const placeDetailsRequests = usage.filter(u => u.usageType === 'place_details').length;
    const totalCostCents = usage.reduce((sum, u) => sum + u.baseCostCents, 0);
    const totalBillableCents = usage.reduce((sum, u) => sum + u.billableCents, 0);

    return {
      totalRequests: usage.length,
      autocompleteRequests,
      placeDetailsRequests,
      totalCostCents: Math.round(totalCostCents * 100) / 100,
      totalBillableCents: Math.round(totalBillableCents * 100) / 100,
      billingPeriod: period,
    };
  }

  /**
   * Generate a new session token
   */
  generateSessionToken(): string {
    return this.googlePlacesService.generateSessionToken();
  }
}
