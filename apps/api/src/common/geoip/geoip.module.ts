import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeoIPService } from './geoip.service';

/**
 * GeoIP Module
 *
 * Provides geographic IP lookup functionality using MaxMind GeoLite2 database.
 * This module is global, so the GeoIPService can be injected anywhere without
 * explicitly importing the module.
 *
 * Configuration:
 * - GEOIP_DATABASE_PATH: Path to the GeoLite2-City.mmdb file
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [GeoIPService],
  exports: [GeoIPService],
})
export class GeoIPModule {}
