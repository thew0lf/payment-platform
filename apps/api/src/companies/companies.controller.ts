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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto/company.dto';

@Controller('admin/companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * List all companies with filtering and pagination
   * GET /api/admin/companies
   */
  @Get()
  async findAll(@Request() req, @Query() query: CompanyQueryDto) {
    return this.companiesService.findAll(req.user, query);
  }

  /**
   * Get company statistics for dashboard
   * GET /api/admin/companies/stats
   */
  @Get('stats')
  async getStats(@Request() req) {
    return this.companiesService.getStats(req.user);
  }

  /**
   * Get single company by ID
   * GET /api/admin/companies/:id
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.companiesService.findOne(req.user, id);
  }

  /**
   * Create a new company
   * POST /api/admin/companies
   */
  @Post()
  async create(@Request() req, @Body() data: CreateCompanyDto) {
    return this.companiesService.create(req.user, data);
  }

  /**
   * Update an existing company
   * PATCH /api/admin/companies/:id
   */
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateCompanyDto,
  ) {
    return this.companiesService.update(req.user, id, data);
  }

  /**
   * Delete (soft) a company
   * DELETE /api/admin/companies/:id
   */
  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.companiesService.delete(req.user, id);
  }
}
