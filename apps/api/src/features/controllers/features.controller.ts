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
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { FeaturesService } from '../services/features.service';
import {
  CreateFeatureDto,
  UpdateFeatureDto,
  UpdateFeatureStatusDto,
  AnswerQuestionsDto,
  CreateIssueDto,
  UpdateIssueDto,
  ResolveIssueDto,
  RetestIssueDto,
  CreateTestAccountDto,
  FeatureQueryDto,
  IssueQueryDto,
} from '../dto/feature.dto';

@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  // ═══════════════════════════════════════════════════════════════
  // FEATURE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Post()
  async create(
    @Body() dto: CreateFeatureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.create(
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Get()
  async findAll(
    @Query() query: FeatureQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.findAll(user.organizationId, query);
  }

  @Get('stats')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.featuresService.getStats(user.organizationId);
  }

  @Get('needs-attention')
  async getNeedsAttention(@CurrentUser() user: AuthenticatedUser) {
    return this.featuresService.getNeedsAttention(user.organizationId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.findOne(id, user.organizationId);
  }

  @Get('code/:code')
  async findByCode(
    @Param('code') code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.findByCode(code, user.organizationId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.updateStatus(id, dto, user.id);
  }

  @Post(':id/answers')
  async answerQuestions(
    @Param('id') id: string,
    @Body() dto: AnswerQuestionsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.answerQuestions(id, dto, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // ISSUE ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Post(':featureId/issues')
  async createIssue(
    @Param('featureId') featureId: string,
    @Body() dto: CreateIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.createIssue(featureId, dto, user.id);
  }

  @Get(':featureId/issues')
  async getIssues(
    @Param('featureId') featureId: string,
    @Query() query: IssueQueryDto,
  ) {
    return this.featuresService.getIssues(featureId, query);
  }

  @Patch('issues/:issueId')
  async updateIssue(
    @Param('issueId') issueId: string,
    @Body() dto: UpdateIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.updateIssue(issueId, dto, user.id);
  }

  @Post('issues/:issueId/resolve')
  async resolveIssue(
    @Param('issueId') issueId: string,
    @Body() dto: ResolveIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.resolveIssue(issueId, dto, user.id);
  }

  @Post('issues/:issueId/retest')
  async retestIssue(
    @Param('issueId') issueId: string,
    @Body() dto: RetestIssueDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.featuresService.retestIssue(issueId, dto, user.id);
  }

  // ═══════════════════════════════════════════════════════════════
  // TEST ACCOUNT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════

  @Post(':featureId/test-accounts')
  async createTestAccount(
    @Param('featureId') featureId: string,
    @Body() dto: CreateTestAccountDto,
  ) {
    return this.featuresService.createTestAccount(featureId, dto);
  }

  @Get(':featureId/test-accounts')
  async getTestAccounts(@Param('featureId') featureId: string) {
    return this.featuresService.getTestAccounts(featureId);
  }
}
