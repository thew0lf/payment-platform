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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType, VideoPlatform } from '@prisma/client';
import { MarketingVideoService } from '../services/marketing-video.service';
import {
  CreateMarketingVideoDto,
  UpdateMarketingVideoDto,
  GenerateVideoFromProductDto,
  GenerateSceneMediaDto,
  GenerateScriptDto,
  ListMarketingVideosQueryDto,
  CreateVideoTemplateDto,
  UpdateVideoTemplateDto,
} from '../dto/marketing-video.dto';

function toUserContext(user: AuthenticatedUser) {
  return {
    sub: user.id,
    scopeType: user.scopeType as ScopeType,
    scopeId: user.scopeId,
    organizationId: user.organizationId,
    clientId: user.clientId,
    companyId: user.companyId,
  };
}

@Controller('marketing-videos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingVideoController {
  constructor(private readonly marketingVideoService: MarketingVideoService) {}

  // ============================================================================
  // Marketing Videos CRUD
  // ============================================================================

  @Get()
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async listVideos(
    @Query('companyId') companyId: string,
    @Query() query: ListMarketingVideosQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.marketingVideoService.listVideos(effectiveCompanyId, toUserContext(user), query);
  }

  @Get(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async getVideo(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.getVideo(id, toUserContext(user));
  }

  @Get(':id/progress')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async getProgress(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.getProgress(id, toUserContext(user));
  }

  @Post()
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async createVideo(
    @Body() dto: CreateMarketingVideoDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.marketingVideoService.createVideo(effectiveCompanyId, dto, toUserContext(user));
  }

  @Patch(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async updateVideo(
    @Param('id') id: string,
    @Body() dto: UpdateMarketingVideoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.updateVideo(id, dto, toUserContext(user));
  }

  @Delete(':id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteVideo(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.deleteVideo(id, toUserContext(user));
  }

  // ============================================================================
  // AI-Powered Generation
  // ============================================================================

  @Post('generate')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async generateFromProduct(
    @Body() dto: GenerateVideoFromProductDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.marketingVideoService.generateFromProduct(effectiveCompanyId, dto, toUserContext(user));
  }

  @Post('generate-scene')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async generateSceneMedia(
    @Body() dto: GenerateSceneMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.generateSceneMedia(dto, toUserContext(user));
  }

  @Post('generate-script')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async generateScript(
    @Body() dto: GenerateScriptDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.generateScript(dto, toUserContext(user));
  }

  @Post(':id/variants')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async generateVariants(
    @Param('id') id: string,
    @Body('platforms') platforms: VideoPlatform[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.generateVariants(id, platforms, toUserContext(user));
  }

  // ============================================================================
  // Video Templates
  // ============================================================================

  @Get('templates/list')
  @Roles('platform_admin', 'client_admin', 'company_admin', 'company_user')
  async listTemplates(
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.marketingVideoService.listTemplates(effectiveCompanyId, toUserContext(user));
  }

  @Post('templates')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async createTemplate(
    @Body() dto: CreateVideoTemplateDto,
    @Query('companyId') companyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const effectiveCompanyId = companyId || user.companyId;
    if (!effectiveCompanyId) {
      throw new Error('Company ID is required');
    }
    return this.marketingVideoService.createTemplate(effectiveCompanyId, dto, toUserContext(user));
  }

  @Patch('templates/:id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateVideoTemplateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.updateTemplate(id, dto, toUserContext(user));
  }

  @Delete('templates/:id')
  @Roles('platform_admin', 'client_admin', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.marketingVideoService.deleteTemplate(id, toUserContext(user));
  }
}
