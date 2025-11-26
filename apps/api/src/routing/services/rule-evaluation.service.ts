import { Injectable, Logger } from '@nestjs/common';
import {
  RoutingRule,
  RuleConditions,
  TransactionContext,
  RoutingDecision,
  RuleActionType,
  RuleStatus,
  RuleAction,
  GeoCondition,
  AmountCondition,
  TimeCondition,
  CustomerCondition,
  ProductCondition,
  PaymentMethodCondition,
} from '../types/routing-rule.types';
import {
  SANCTIONED_COUNTRIES,
  HIGH_RISK_COUNTRIES,
  EU_COUNTRIES,
  EEA_COUNTRIES,
  COUNTRY_TO_CONTINENT,
  COUNTRY_TO_REGION,
  US_STATE_TO_REGION,
} from '../types/routing.constants';

@Injectable()
export class RuleEvaluationService {
  private readonly logger = new Logger(RuleEvaluationService.name);

  /**
   * Evaluate all rules against a transaction context
   */
  evaluate(rules: RoutingRule[], context: TransactionContext): RoutingDecision {
    const startTime = Date.now();
    let conditionsChecked = 0;

    const decision: RoutingDecision = {
      success: true,
      blocked: false,
      flaggedForReview: false,
      require3ds: false,
      surchargeAmount: 0,
      discountAmount: 0,
      finalAmount: context.amount,
      addedMetadata: {},
      appliedRules: [],
      evaluationTimeMs: 0,
      rulesEvaluated: 0,
      conditionsChecked: 0,
    };

    // Sort by priority (lower = higher priority)
    const sortedRules = [...rules]
      .filter(r => this.isRuleActive(r))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      decision.rulesEvaluated++;

      const { matches, checked } = this.evaluateConditions(rule.conditions, context);
      conditionsChecked += checked;

      if (matches) {
        // A/B testing check
        if (rule.testing?.enabled) {
          const inTestGroup = Math.random() * 100 < rule.testing.trafficPercentage;
          if (inTestGroup && rule.testing.testPoolId) {
            decision.routeToPoolId = rule.testing.testPoolId;
          } else if (rule.testing.controlPoolId) {
            decision.routeToPoolId = rule.testing.controlPoolId;
          }
        }

        // Apply actions
        for (const action of rule.actions) {
          this.applyAction(action, decision, context);
        }

        decision.appliedRules.push({
          id: rule.id,
          name: rule.name,
          action: rule.actions[0]?.type || 'unknown',
        });

        // If blocked, stop processing
        if (decision.blocked) break;

        // If routed, stop processing (unless we want to apply multiple rules)
        if (decision.routeToPoolId || decision.routeToAccountId) break;
      }
    }

    // Calculate final amount
    decision.finalAmount = context.amount + decision.surchargeAmount - decision.discountAmount;
    decision.evaluationTimeMs = Date.now() - startTime;
    decision.conditionsChecked = conditionsChecked;

    return decision;
  }

  private isRuleActive(rule: RoutingRule): boolean {
    if (rule.status !== RuleStatus.ACTIVE && rule.status !== RuleStatus.TESTING) {
      return false;
    }

    const now = new Date();

    if (rule.schedule?.activateAt && now < rule.schedule.activateAt) {
      return false;
    }

    if (rule.schedule?.deactivateAt && now > rule.schedule.deactivateAt) {
      return false;
    }

    return true;
  }

  private evaluateConditions(
    conditions: RuleConditions,
    context: TransactionContext,
  ): { matches: boolean; checked: number } {
    let checked = 0;

    // All conditions must match (AND logic)
    if (conditions.geo) {
      checked++;
      if (!this.evaluateGeoCondition(conditions.geo, context)) {
        return { matches: false, checked };
      }
    }

    if (conditions.amount) {
      checked++;
      if (!this.evaluateAmountCondition(conditions.amount, context)) {
        return { matches: false, checked };
      }
    }

    if (conditions.time) {
      checked++;
      if (!this.evaluateTimeCondition(conditions.time, context)) {
        return { matches: false, checked };
      }
    }

    if (conditions.customer) {
      checked++;
      if (!this.evaluateCustomerCondition(conditions.customer, context)) {
        return { matches: false, checked };
      }
    }

    if (conditions.product) {
      checked++;
      if (!this.evaluateProductCondition(conditions.product, context)) {
        return { matches: false, checked };
      }
    }

    if (conditions.paymentMethod) {
      checked++;
      if (!this.evaluatePaymentMethodCondition(conditions.paymentMethod, context)) {
        return { matches: false, checked };
      }
    }

    return { matches: true, checked };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONDITION EVALUATORS
  // ═══════════════════════════════════════════════════════════════

  private evaluateGeoCondition(condition: GeoCondition, context: TransactionContext): boolean {
    const country = context.billingCountry?.toUpperCase();
    const state = context.billingState?.toUpperCase();
    const ipCountry = context.ipCountry?.toUpperCase();

    // Sanctioned countries check
    if (condition.sanctionedCountries && country && SANCTIONED_COUNTRIES.includes(country)) {
      return true;
    }

    // High-risk countries check
    if (condition.highRiskCountries && country && HIGH_RISK_COUNTRIES.includes(country)) {
      return true;
    }

    // Country include/exclude
    if (condition.countries?.length && country) {
      if (!condition.countries.map(c => c.toUpperCase()).includes(country)) {
        return false;
      }
    }
    if (condition.excludeCountries?.length && country) {
      if (condition.excludeCountries.map(c => c.toUpperCase()).includes(country)) {
        return false;
      }
    }

    // State include/exclude
    if (condition.states?.length && state) {
      if (!condition.states.map(s => s.toUpperCase()).includes(state)) {
        return false;
      }
    }
    if (condition.excludeStates?.length && state) {
      if (condition.excludeStates.map(s => s.toUpperCase()).includes(state)) {
        return false;
      }
    }

    // Region check
    if (condition.regions?.length && country) {
      const region = COUNTRY_TO_REGION[country] || US_STATE_TO_REGION[state || ''];
      if (!region || !condition.regions.includes(region)) {
        return false;
      }
    }

    // Continent check
    if (condition.continents?.length && country) {
      const continent = COUNTRY_TO_CONTINENT[country];
      if (!continent || !condition.continents.includes(continent)) {
        return false;
      }
    }

    // Currency check
    if (condition.currencies?.length) {
      if (!condition.currencies.includes(context.currency)) {
        return false;
      }
    }

    // EU/EEA checks
    if (condition.euOnly && country && !EU_COUNTRIES.includes(country)) {
      return false;
    }
    if (condition.eeaOnly && country && !EEA_COUNTRIES.includes(country)) {
      return false;
    }

    // Domestic/International
    // TODO: Need merchant country to compare
    if (condition.internationalOnly && country === 'US') {
      return false;
    }

    // IP matching
    if (condition.requireIpMatch && country && ipCountry && country !== ipCountry) {
      return false;
    }

    return true;
  }

  private evaluateAmountCondition(condition: AmountCondition, context: TransactionContext): boolean {
    const amount = context.amount;

    // Simple min/max
    if (condition.min !== undefined && amount < condition.min) {
      return false;
    }
    if (condition.max !== undefined && amount > condition.max) {
      return false;
    }

    // Ranges
    if (condition.ranges?.length) {
      const inRange = condition.ranges.some(range => {
        if (amount < range.min) return false;
        if (range.max !== null && amount > range.max) return false;
        return true;
      });
      if (!inRange) return false;
    }

    // Currency-specific amounts
    if (condition.currencyAmounts && context.currency) {
      const currencyLimits = condition.currencyAmounts[context.currency];
      if (currencyLimits) {
        if (currencyLimits.min !== undefined && amount < currencyLimits.min) {
          return false;
        }
        if (currencyLimits.max !== undefined && amount > currencyLimits.max) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateTimeCondition(condition: TimeCondition, context: TransactionContext): boolean {
    const now = context.timestamp || new Date();
    const timezone = condition.timezone || 'UTC';

    // Convert to timezone
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const hour = localDate.getHours();
    const dayOfWeek = localDate.getDay();
    const dayOfMonth = localDate.getDate();

    // Hour range
    if (condition.startHour !== undefined && condition.endHour !== undefined) {
      if (condition.startHour <= condition.endHour) {
        if (hour < condition.startHour || hour > condition.endHour) return false;
      } else {
        // Overnight range (e.g., 22:00 - 06:00)
        if (hour < condition.startHour && hour > condition.endHour) return false;
      }
    }

    // Days of week
    if (condition.daysOfWeek?.length) {
      if (!condition.daysOfWeek.includes(dayOfWeek)) return false;
    }
    if (condition.excludeDays?.length) {
      if (condition.excludeDays.includes(dayOfWeek)) return false;
    }

    // Weekend/Weekday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (condition.weekendOnly && !isWeekend) return false;
    if (condition.weekdayOnly && isWeekend) return false;

    // Business hours (9-5 Mon-Fri)
    if (condition.businessHoursOnly) {
      if (isWeekend || hour < 9 || hour >= 17) return false;
    }
    if (condition.afterHoursOnly) {
      if (!isWeekend && hour >= 9 && hour < 17) return false;
    }

    // Month days
    if (condition.monthDays?.length) {
      if (!condition.monthDays.includes(dayOfMonth)) return false;
    }

    // Date range
    if (condition.startDate && now < new Date(condition.startDate)) return false;
    if (condition.endDate && now > new Date(condition.endDate)) return false;

    return true;
  }

  private evaluateCustomerCondition(condition: CustomerCondition, context: TransactionContext): boolean {
    // Customer type
    if (condition.customerTypes?.length && context.customerType) {
      if (!condition.customerTypes.includes(context.customerType)) return false;
    }
    if (condition.excludeCustomerTypes?.length && context.customerType) {
      if (condition.excludeCustomerTypes.includes(context.customerType)) return false;
    }

    // Account age
    if (condition.minAccountAgeDays !== undefined && context.customerAccountAge !== undefined) {
      if (context.customerAccountAge < condition.minAccountAgeDays) return false;
    }
    if (condition.maxAccountAgeDays !== undefined && context.customerAccountAge !== undefined) {
      if (context.customerAccountAge > condition.maxAccountAgeDays) return false;
    }

    // New customer
    if (condition.isNewCustomer !== undefined) {
      const isNew = (context.customerAccountAge || 0) === 0;
      if (condition.isNewCustomer !== isNew) return false;
    }

    // Lifetime value
    if (condition.minLifetimeValue !== undefined && context.customerLifetimeValue !== undefined) {
      if (context.customerLifetimeValue < condition.minLifetimeValue) return false;
    }

    // Risk score
    if (condition.maxRiskScore !== undefined && context.customerRiskScore !== undefined) {
      if (context.customerRiskScore > condition.maxRiskScore) return false;
    }
    if (condition.minRiskScore !== undefined && context.customerRiskScore !== undefined) {
      if (context.customerRiskScore < condition.minRiskScore) return false;
    }

    // Segments
    if (condition.segments?.length && context.customerSegments) {
      const hasSegment = condition.segments.some(s => context.customerSegments!.includes(s));
      if (!hasSegment) return false;
    }

    // Specific customers
    if (condition.customerIds?.length && context.customerId) {
      if (!condition.customerIds.includes(context.customerId)) return false;
    }
    if (condition.excludeCustomerIds?.length && context.customerId) {
      if (condition.excludeCustomerIds.includes(context.customerId)) return false;
    }

    return true;
  }

  private evaluateProductCondition(condition: ProductCondition, context: TransactionContext): boolean {
    // SKUs
    if (condition.skus?.length && context.productSkus?.length) {
      const hasMatch = condition.skus.some(sku => context.productSkus!.includes(sku));
      if (!hasMatch) return false;
    }
    if (condition.excludeSkus?.length && context.productSkus?.length) {
      const hasExcluded = condition.excludeSkus.some(sku => context.productSkus!.includes(sku));
      if (hasExcluded) return false;
    }

    // Categories
    if (condition.categories?.length && context.productCategories?.length) {
      const hasMatch = condition.categories.some(cat => context.productCategories!.includes(cat));
      if (!hasMatch) return false;
    }
    if (condition.excludeCategories?.length && context.productCategories?.length) {
      const hasExcluded = condition.excludeCategories.some(cat => context.productCategories!.includes(cat));
      if (hasExcluded) return false;
    }

    // Product type
    if (condition.productTypes?.length && context.productType) {
      if (!condition.productTypes.includes(context.productType)) return false;
    }

    // Subscription
    if (condition.isSubscription !== undefined) {
      if (condition.isSubscription !== context.isSubscription) return false;
    }
    if (condition.isRenewal !== undefined) {
      if (condition.isRenewal !== context.isRenewal) return false;
    }
    if (condition.subscriptionTiers?.length && context.subscriptionTier) {
      if (!condition.subscriptionTiers.includes(context.subscriptionTier)) return false;
    }

    return true;
  }

  private evaluatePaymentMethodCondition(
    condition: PaymentMethodCondition,
    context: TransactionContext,
  ): boolean {
    // Card brand
    if (condition.cardBrands?.length && context.cardBrand) {
      if (!condition.cardBrands.map(b => b.toUpperCase()).includes(context.cardBrand.toUpperCase())) {
        return false;
      }
    }
    if (condition.excludeCardBrands?.length && context.cardBrand) {
      if (condition.excludeCardBrands.map(b => b.toUpperCase()).includes(context.cardBrand.toUpperCase())) {
        return false;
      }
    }

    // Card type
    if (condition.cardTypes?.length && context.cardType) {
      if (!condition.cardTypes.map(t => t.toUpperCase()).includes(context.cardType.toUpperCase())) {
        return false;
      }
    }
    if (condition.excludeCardTypes?.length && context.cardType) {
      if (condition.excludeCardTypes.map(t => t.toUpperCase()).includes(context.cardType.toUpperCase())) {
        return false;
      }
    }

    // BIN ranges
    if (condition.binRanges?.length && context.cardBin) {
      const inRange = condition.binRanges.some(range =>
        context.cardBin! >= range.start && context.cardBin! <= range.end
      );
      if (!inRange) return false;
    }

    // Issuing country
    if (condition.issuingCountries?.length && context.ipCountry) {
      if (!condition.issuingCountries.includes(context.ipCountry)) return false;
    }

    // Tokenization
    if (condition.isTokenized !== undefined) {
      if (condition.isTokenized !== context.isTokenized) return false;
    }

    // 3DS
    if (condition.is3dsEnrolled !== undefined) {
      if (condition.is3dsEnrolled !== context.is3dsEnrolled) return false;
    }

    // Digital wallet
    if (condition.isDigitalWallet !== undefined) {
      if (condition.isDigitalWallet !== context.isDigitalWallet) return false;
    }
    if (condition.walletTypes?.length && context.walletType) {
      if (!condition.walletTypes.includes(context.walletType)) return false;
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTION APPLIERS
  // ═══════════════════════════════════════════════════════════════

  private applyAction(
    action: RuleAction,
    decision: RoutingDecision,
    context: TransactionContext,
  ): void {
    switch (action.type) {
      case RuleActionType.ROUTE_TO_POOL:
        decision.routeToPoolId = action.poolId;
        break;

      case RuleActionType.ROUTE_TO_ACCOUNT:
        decision.routeToAccountId = action.accountId;
        if (action.accountIds) {
          decision.fallbackAccountIds = action.accountIds.slice(1);
        }
        break;

      case RuleActionType.BLOCK:
        decision.blocked = true;
        decision.blockReason = action.blockReason;
        decision.blockCode = action.blockCode;
        break;

      case RuleActionType.FLAG_FOR_REVIEW:
        decision.flaggedForReview = true;
        decision.reviewReason = action.reviewReason;
        decision.reviewPriority = action.reviewPriority;
        break;

      case RuleActionType.APPLY_SURCHARGE:
        if (action.surchargeType === 'percentage') {
          decision.surchargeAmount += Math.round(context.amount * (action.surchargeValue! / 100));
        } else {
          decision.surchargeAmount += action.surchargeValue!;
        }
        break;

      case RuleActionType.APPLY_DISCOUNT:
        if (action.discountType === 'percentage') {
          decision.discountAmount += Math.round(context.amount * (action.discountValue! / 100));
        } else {
          decision.discountAmount += action.discountValue!;
        }
        break;

      case RuleActionType.REQUIRE_3DS:
        decision.require3ds = true;
        break;

      case RuleActionType.SKIP_3DS:
        decision.require3ds = false;
        break;

      case RuleActionType.ADD_METADATA:
        Object.assign(decision.addedMetadata, action.addMetadata);
        break;

      case RuleActionType.NOTIFY:
        // TODO: Emit notification event
        this.logger.log(`Notification triggered: ${action.notifyTemplate}`);
        break;

      case RuleActionType.LOG_ONLY:
        this.logger.log(`Rule matched (log only): ${JSON.stringify(action)}`);
        break;
    }
  }
}
