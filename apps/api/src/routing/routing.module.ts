import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RuleEvaluationService } from './services/rule-evaluation.service';
import { RoutingRuleService } from './services/routing-rule.service';
import { RoutingController } from './routing.controller';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [RoutingController],
  providers: [RuleEvaluationService, RoutingRuleService],
  exports: [RoutingRuleService, RuleEvaluationService],
})
export class RoutingModule {}
