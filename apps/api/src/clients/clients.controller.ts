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
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, ClientQueryDto } from './dto/client.dto';

@Controller('admin/clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * List all clients with filtering and pagination
   * GET /api/admin/clients
   */
  @Get()
  async findAll(@Request() req, @Query() query: ClientQueryDto) {
    return this.clientsService.findAll(req.user, query);
  }

  /**
   * Get client statistics for dashboard
   * GET /api/admin/clients/stats
   */
  @Get('stats')
  async getStats(@Request() req) {
    return this.clientsService.getStats(req.user);
  }

  /**
   * Get single client by ID
   * GET /api/admin/clients/:id
   */
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.clientsService.findOne(req.user, id);
  }

  /**
   * Create a new client
   * POST /api/admin/clients
   */
  @Post()
  async create(@Request() req, @Body() data: CreateClientDto) {
    return this.clientsService.create(req.user, data);
  }

  /**
   * Update an existing client
   * PATCH /api/admin/clients/:id
   */
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() data: UpdateClientDto,
  ) {
    return this.clientsService.update(req.user, id, data);
  }

  /**
   * Delete (soft) a client
   * DELETE /api/admin/clients/:id
   */
  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string) {
    return this.clientsService.delete(req.user, id);
  }
}
