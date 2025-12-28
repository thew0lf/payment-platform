import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GatewayTermsService } from '../services/gateway-terms.service';
import {
  CreateGatewayTermsDocumentDto,
  UpdateGatewayTermsDocumentDto,
  AcceptGatewayTermsDto,
} from '../dto/gateway-terms.dto';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { MerchantRiskLevel } from '@prisma/client';

@Controller('admin/gateway-risk/terms')
@UseGuards(JwtAuthGuard)
export class GatewayTermsController {
  constructor(private readonly termsService: GatewayTermsService) {}

  @Post()
  async createTermsDocument(
    @Body() dto: CreateGatewayTermsDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.termsService.createTermsDocument(dto, user.id);
  }

  @Get()
  async getTermsDocuments(@Query('platformIntegrationId') platformIntegrationId: string) {
    return this.termsService.getTermsDocumentsForIntegration(platformIntegrationId);
  }

  @Get(':id')
  async getTermsDocument(@Param('id') id: string) {
    return this.termsService.getTermsDocument(id);
  }

  @Patch(':id')
  async updateTermsDocument(
    @Param('id') id: string,
    @Body() dto: UpdateGatewayTermsDocumentDto,
  ) {
    return this.termsService.updateTermsDocument(id, dto);
  }

  @Delete(':id')
  async deleteTermsDocument(@Param('id') id: string) {
    return this.termsService.deleteTermsDocument(id);
  }

  @Get('current/:platformIntegrationId')
  async getCurrentTermsForRiskLevel(
    @Param('platformIntegrationId') platformIntegrationId: string,
    @Query('riskLevel') riskLevel: MerchantRiskLevel,
  ) {
    return this.termsService.getCurrentTermsForRiskLevel(platformIntegrationId, riskLevel);
  }

  @Get('required/:platformIntegrationId/:clientId')
  async getRequiredTermsForClient(
    @Param('platformIntegrationId') platformIntegrationId: string,
    @Param('clientId') clientId: string,
    @Query('riskLevel') riskLevel: MerchantRiskLevel,
  ) {
    return this.termsService.getRequiredTermsForClient(platformIntegrationId, clientId, riskLevel);
  }

  @Post('accept')
  async acceptTerms(
    @Body() dto: AcceptGatewayTermsDto,
    @Query('clientId') clientId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'];
    return this.termsService.acceptTerms(dto, clientId, user.id, ipAddress, userAgent);
  }

  @Get('acceptances/:clientId')
  async getClientAcceptances(@Param('clientId') clientId: string) {
    return this.termsService.getClientAcceptances(clientId);
  }

  @Post('acceptances/:id/revoke')
  async revokeAcceptance(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.termsService.revokeAcceptance(id, user.id, reason);
  }
}
