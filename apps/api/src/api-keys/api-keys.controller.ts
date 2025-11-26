import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeysService, CreateApiKeyDto, UpdateApiKeyDto } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsArray, IsOptional, IsDateString, IsBoolean, MinLength, ArrayMinSize } from 'class-validator';

class CreateApiKeyRequestDto implements CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  scopes: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

class CreateApiKeyForClientDto extends CreateApiKeyRequestDto {
  @IsString()
  clientId: string;
}

class UpdateApiKeyRequestDto implements UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async getApiKeys(@Request() req) {
    return this.apiKeysService.getApiKeys(req.user);
  }

  @Get('scopes')
  async getAvailableScopes() {
    return this.apiKeysService.getAvailableScopes();
  }

  @Post()
  async createApiKey(@Request() req, @Body() dto: CreateApiKeyRequestDto) {
    return this.apiKeysService.createApiKey(req.user, dto);
  }

  @Post('for-client')
  async createApiKeyForClient(@Request() req, @Body() dto: CreateApiKeyForClientDto) {
    const { clientId, ...createDto } = dto;
    return this.apiKeysService.createApiKeyForClient(req.user, clientId, createDto);
  }

  @Patch(':id')
  async updateApiKey(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyRequestDto,
  ) {
    return this.apiKeysService.updateApiKey(req.user, id, dto);
  }

  @Post(':id/regenerate')
  async regenerateApiKey(@Request() req, @Param('id') id: string) {
    return this.apiKeysService.regenerateApiKey(req.user, id);
  }

  @Delete(':id')
  async deleteApiKey(@Request() req, @Param('id') id: string) {
    return this.apiKeysService.deleteApiKey(req.user, id);
  }
}
