import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SitesService } from './sites.service';
import { CreateSiteDto, UpdateSiteDto, SiteQueryDto } from './dto/site.dto';

@Controller('admin/sites')
@UseGuards(JwtAuthGuard)
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  /**
   * List all sites with filtering and pagination
   * GET /api/admin/sites
   */
  @Get()
  async findAll(@Request() req, @Query() query: SiteQueryDto) {
    return this.sitesService.findAll(req.user, query);
  }

  /**
   * Get site statistics
   * GET /api/admin/sites/stats
   */
  @Get('stats')
  async getStats(@Request() req, @Query('companyId') companyId?: string) {
    return this.sitesService.getStats(req.user, companyId);
  }

  /**
   * Get single site by ID
   * GET /api/admin/sites/:id
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.sitesService.findOne(req.user, id);
  }

  /**
   * Create a new site
   * POST /api/admin/sites
   */
  @Post()
  async create(@Request() req, @Body() data: CreateSiteDto) {
    return this.sitesService.create(req.user, data);
  }

  /**
   * Update an existing site
   * PATCH /api/admin/sites/:id
   */
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateSiteDto,
  ) {
    return this.sitesService.update(req.user, id, data);
  }

  /**
   * Set site as default for its company
   * POST /api/admin/sites/:id/set-default
   */
  @Post(':id/set-default')
  async setDefault(@Request() req, @Param('id') id: string) {
    return this.sitesService.setDefault(req.user, id);
  }

  /**
   * Delete (soft) a site
   * DELETE /api/admin/sites/:id
   */
  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.sitesService.delete(req.user, id);
  }
}
