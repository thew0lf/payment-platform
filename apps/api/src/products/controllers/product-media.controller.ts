import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ProductMediaService } from '../services/product-media.service';
import { HierarchyService } from '../../hierarchy/hierarchy.service';
import {
  CreateMediaDto,
  UpdateMediaDto,
  ReorderMediaDto,
  ProcessMediaDto,
} from '../dto/product-media.dto';
import { ScopeType } from '@prisma/client';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to convert AuthenticatedUser to UserContext
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

@Controller('products/:productId/media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductMediaController {
  constructor(
    private readonly mediaService: ProductMediaService,
    private readonly hierarchyService: HierarchyService,
  ) {}

  @Get()
  async listMedia(
    @Param('productId') productId: string,
    @Query('variantId') variantId: string | undefined,
    @Query('companyId') queryCompanyId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Verify user has access to the company context
    await this.getCompanyIdForQuery(user, queryCompanyId);
    return this.mediaService.listMedia(productId, variantId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    return this.mediaService.uploadMedia(productId, file, dto, toUserContext(user));
  }

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleMedia(
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: CreateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validate all files
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(`File type ${file.mimetype} not allowed for ${file.originalname}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(`File ${file.originalname} exceeds size limit`);
      }
    }

    return this.mediaService.uploadMultipleMedia(productId, files, dto, toUserContext(user));
  }

  @Patch(':mediaId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async updateMedia(
    @Param('productId') productId: string,
    @Param('mediaId') mediaId: string,
    @Body() dto: UpdateMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.updateMedia(productId, mediaId, dto, toUserContext(user));
  }

  @Delete(':mediaId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(
    @Param('productId') productId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.deleteMedia(productId, mediaId, toUserContext(user));
  }

  @Post('reorder')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async reorderMedia(
    @Param('productId') productId: string,
    @Body() dto: ReorderMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.reorderMedia(productId, dto.mediaIds, toUserContext(user));
  }

  @Post(':mediaId/primary')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async setAsPrimary(
    @Param('productId') productId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.setAsPrimary(productId, mediaId, toUserContext(user));
  }

  @Post(':mediaId/process')
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  async processMedia(
    @Param('productId') productId: string,
    @Param('mediaId') mediaId: string,
    @Body() dto: ProcessMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mediaService.processMedia(productId, mediaId, dto, toUserContext(user));
  }

  /**
   * Get companyId for write operations (create/update/delete).
   * Requires explicit company context.
   */
  private getCompanyId(user: AuthenticatedUser): string {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    throw new ForbiddenException('Company ID is required. Please select a company or provide companyId parameter.');
  }

  /**
   * Get companyId for query operations.
   * Validates company access when query param is provided.
   */
  private async getCompanyIdForQuery(user: AuthenticatedUser, queryCompanyId?: string): Promise<string | undefined> {
    if (user.scopeType === 'COMPANY') {
      return user.scopeId;
    }
    if (user.companyId) {
      return user.companyId;
    }
    if (user.scopeType === 'ORGANIZATION' || user.scopeType === 'CLIENT') {
      if (queryCompanyId) {
        const hasAccess = await this.hierarchyService.canAccessCompany(
          {
            sub: user.id,
            scopeType: user.scopeType as ScopeType,
            scopeId: user.scopeId,
            clientId: user.clientId,
            companyId: user.companyId,
          },
          queryCompanyId,
        );
        if (!hasAccess) {
          throw new ForbiddenException('Hmm, you don\'t have access to that company. Double-check your permissions or try a different one.');
        }
        return queryCompanyId;
      }
      return undefined;
    }
    return undefined;
  }
}
