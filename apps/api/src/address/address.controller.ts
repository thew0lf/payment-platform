import { Controller, Get, Query, BadRequestException, Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddressService } from './address.service';

@Controller('address')
@UseGuards(JwtAuthGuard)
export class AddressController {
  private readonly logger = new Logger(AddressController.name);

  constructor(private readonly addressService: AddressService) {}

  /**
   * GET /api/address/autocomplete
   * Get address autocomplete predictions
   *
   * Query params:
   * - input: Search input (required)
   * - sessionToken: Session token for bundling requests (required)
   * - companyId: Company ID (required)
   * - countries: Comma-separated country codes to restrict results (optional)
   */
  @Get('autocomplete')
  async autocomplete(
    @Query('input') input: string,
    @Query('sessionToken') sessionToken: string,
    @Query('companyId') companyId: string,
    @Query('countries') countries?: string,
  ) {
    if (!input || input.length < 3) {
      return { predictions: [], sessionToken };
    }

    if (!sessionToken) {
      throw new BadRequestException('Session token is required');
    }

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    try {
      const countriesArray = countries ? countries.split(',').map(c => c.trim().toLowerCase()) : undefined;
      const result = await this.addressService.autocomplete(companyId, input, sessionToken, countriesArray);
      return result;
    } catch (error) {
      this.logger.error('Autocomplete error', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch suggestions',
        predictions: [],
      };
    }
  }

  /**
   * GET /api/address/details
   * Get full address details for a place ID
   *
   * Query params:
   * - placeId: Google Place ID (required)
   * - sessionToken: Session token for bundling requests (required)
   * - companyId: Company ID (required)
   */
  @Get('details')
  async getDetails(
    @Query('placeId') placeId: string,
    @Query('sessionToken') sessionToken: string,
    @Query('companyId') companyId: string,
  ) {
    if (!placeId) {
      throw new BadRequestException('Place ID is required');
    }

    if (!sessionToken) {
      throw new BadRequestException('Session token is required');
    }

    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    try {
      const result = await this.addressService.getPlaceDetails(companyId, placeId, sessionToken);
      return result;
    } catch (error) {
      this.logger.error('Place details error', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to get address details',
      };
    }
  }

  /**
   * GET /api/address/session-token
   * Generate a new session token for autocomplete requests
   */
  @Get('session-token')
  generateSessionToken() {
    return {
      sessionToken: this.addressService.generateSessionToken(),
    };
  }

  /**
   * GET /api/address/usage
   * Get address API usage statistics for a company
   *
   * Query params:
   * - companyId: Company ID (required)
   * - billingPeriod: YYYY-MM format (optional, defaults to current month)
   */
  @Get('usage')
  async getUsage(
    @Query('companyId') companyId: string,
    @Query('billingPeriod') billingPeriod?: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required');
    }

    try {
      const stats = await this.addressService.getUsageStats(companyId, billingPeriod);
      return stats;
    } catch (error) {
      this.logger.error('Usage stats error', error);
      throw error;
    }
  }
}
