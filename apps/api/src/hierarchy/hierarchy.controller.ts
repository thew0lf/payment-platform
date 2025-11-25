import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('hierarchy')
@UseGuards(JwtAuthGuard)
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get('accessible')
  async getAccessibleHierarchy(@Request() req) {
    return this.hierarchyService.getAccessibleHierarchy(req.user);
  }
}
