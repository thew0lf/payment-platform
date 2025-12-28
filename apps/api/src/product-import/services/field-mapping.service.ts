import { Injectable, Logger } from '@nestjs/common';
import {
  FieldMapping,
  FieldTransform,
  FieldTransformConfig,
  FieldMappingCondition,
  SimpleCondition,
  CompoundCondition,
  ConditionOperator,
  FieldValidationRule,
  ValidationResult,
  ValidationError,
  ValidationType,
  DateFormatOptions,
  NumberFormatOptions,
  ReplaceOptions,
  SplitOptions,
  JoinOptions,
  SubstringOptions,
  PadOptions,
  TemplateOptions,
  LookupOptions,
  MathOptions,
  ExternalProduct,
} from '../types/product-import.types';

@Injectable()
export class FieldMappingService {
  private readonly logger = new Logger(FieldMappingService.name);

  /**
   * Apply field mappings to a product with conditions, transforms, and validation
   */
  applyMappings(
    product: ExternalProduct,
    mappings: FieldMapping[],
  ): { data: Record<string, unknown>; validation: ValidationResult } {
    const result: Record<string, unknown> = {};
    const validationErrors: ValidationError[] = [];

    for (const mapping of mappings) {
      // Check condition first
      if (mapping.condition && !this.evaluateCondition(product, mapping.condition)) {
        // Condition not met, skip this mapping but apply default if provided
        if (mapping.defaultValue !== undefined) {
          result[mapping.targetField] = mapping.defaultValue;
        }
        continue;
      }

      // Get source value
      let value = this.getNestedValue(product, mapping.sourceField);

      // Apply default if value is null/undefined
      if ((value === undefined || value === null) && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      // Apply transforms
      if (mapping.transform) {
        value = this.applyTransforms(value, mapping.transform, product);
      }

      // Validate if rules are present
      if (mapping.validation?.length) {
        const errors = this.validateField(
          mapping.targetField,
          value,
          mapping.validation,
        );
        validationErrors.push(...errors);
      }

      result[mapping.targetField] = value;
    }

    return {
      data: result,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CONDITION EVALUATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Evaluate a mapping condition against a product
   */
  evaluateCondition(product: ExternalProduct, condition: FieldMappingCondition): boolean {
    if (condition.type === 'simple' && condition.rule) {
      return this.evaluateSimpleCondition(product, condition.rule);
    }

    if (condition.type === 'compound' && condition.rules) {
      return this.evaluateCompoundCondition(product, condition.rules);
    }

    return true; // Default to true if condition is malformed
  }

  private evaluateSimpleCondition(product: ExternalProduct, rule: SimpleCondition): boolean {
    const fieldValue = this.getNestedValue(product, rule.field);
    return this.evaluateOperator(fieldValue, rule.operator, rule.value);
  }

  private evaluateCompoundCondition(
    product: ExternalProduct,
    compound: CompoundCondition,
  ): boolean {
    const results = compound.conditions.map((cond) => {
      if ('operator' in cond && (cond.operator === 'and' || cond.operator === 'or')) {
        return this.evaluateCompoundCondition(product, cond as CompoundCondition);
      }
      return this.evaluateSimpleCondition(product, cond as SimpleCondition);
    });

    if (compound.operator === 'and') {
      return results.every((r) => r);
    }
    return results.some((r) => r);
  }

  private evaluateOperator(
    fieldValue: unknown,
    operator: ConditionOperator,
    compareValue?: unknown,
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'notEquals':
        return fieldValue !== compareValue;
      case 'contains':
        if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
          return fieldValue.includes(compareValue);
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(compareValue);
        }
        return false;
      case 'notContains':
        return !this.evaluateOperator(fieldValue, 'contains', compareValue);
      case 'startsWith':
        return typeof fieldValue === 'string' &&
               typeof compareValue === 'string' &&
               fieldValue.startsWith(compareValue);
      case 'endsWith':
        return typeof fieldValue === 'string' &&
               typeof compareValue === 'string' &&
               fieldValue.endsWith(compareValue);
      case 'matches':
        if (typeof fieldValue === 'string' && typeof compareValue === 'string') {
          try {
            return new RegExp(compareValue).test(fieldValue);
          } catch {
            return false;
          }
        }
        return false;
      case 'isEmpty':
        return fieldValue === null ||
               fieldValue === undefined ||
               fieldValue === '' ||
               (Array.isArray(fieldValue) && fieldValue.length === 0);
      case 'isNotEmpty':
        return !this.evaluateOperator(fieldValue, 'isEmpty');
      case 'greaterThan':
        return typeof fieldValue === 'number' &&
               typeof compareValue === 'number' &&
               fieldValue > compareValue;
      case 'lessThan':
        return typeof fieldValue === 'number' &&
               typeof compareValue === 'number' &&
               fieldValue < compareValue;
      case 'greaterThanOrEqual':
        return typeof fieldValue === 'number' &&
               typeof compareValue === 'number' &&
               fieldValue >= compareValue;
      case 'lessThanOrEqual':
        return typeof fieldValue === 'number' &&
               typeof compareValue === 'number' &&
               fieldValue <= compareValue;
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      default:
        return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRANSFORMS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Apply one or more transforms to a value
   */
  applyTransforms(
    value: unknown,
    transform: FieldTransform | FieldTransformConfig | FieldTransformConfig[],
    product?: ExternalProduct,
  ): unknown {
    if (value === undefined || value === null) return value;

    // Handle array of transforms (chained)
    if (Array.isArray(transform)) {
      return transform.reduce(
        (acc, t) => this.applySingleTransform(acc, t, product),
        value,
      );
    }

    // Handle single transform
    return this.applySingleTransform(value, transform, product);
  }

  private applySingleTransform(
    value: unknown,
    transform: FieldTransform | FieldTransformConfig,
    product?: ExternalProduct,
  ): unknown {
    // Handle string shorthand transforms
    if (typeof transform === 'string') {
      return this.applySimpleTransform(value, transform);
    }

    // Handle config-based transforms
    return this.applyConfigTransform(value, transform, product);
  }

  private applySimpleTransform(value: unknown, transform: FieldTransform): unknown {
    switch (transform) {
      // String transforms
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'capitalize':
        return typeof value === 'string'
          ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          : value;
      case 'capitalizeWords':
        return typeof value === 'string'
          ? value.replace(/\b\w/g, (c) => c.toUpperCase())
          : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'trimStart':
        return typeof value === 'string' ? value.trimStart() : value;
      case 'trimEnd':
        return typeof value === 'string' ? value.trimEnd() : value;
      case 'slug':
        return typeof value === 'string'
          ? value
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          : value;
      case 'stripHtml':
        return typeof value === 'string'
          ? value.replace(/<[^>]*>/g, '')
          : value;

      // Number transforms
      case 'centsToDecimal':
        return typeof value === 'number' ? value / 100 : value;
      case 'decimalToCents':
        return typeof value === 'number' ? Math.round(value * 100) : value;
      case 'round':
        return typeof value === 'number' ? Math.round(value) : value;
      case 'floor':
        return typeof value === 'number' ? Math.floor(value) : value;
      case 'ceil':
        return typeof value === 'number' ? Math.ceil(value) : value;
      case 'abs':
        return typeof value === 'number' ? Math.abs(value) : value;

      // Type transforms
      case 'boolean':
        return Boolean(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;
      case 'string':
        return String(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'json':
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;

      // Date transforms
      case 'isoDate':
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date.toISOString();
        }
        return value;
      case 'timestamp':
        if (value instanceof Date) {
          return value.getTime();
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? value : date.getTime();
        }
        return value;

      default:
        return value;
    }
  }

  private applyConfigTransform(
    value: unknown,
    config: FieldTransformConfig,
    product?: ExternalProduct,
  ): unknown {
    // First check if it's a simple transform type
    if (!config.options && this.isSimpleTransform(config.type)) {
      return this.applySimpleTransform(value, config.type as FieldTransform);
    }

    // Handle advanced transforms with options
    switch (config.type) {
      case 'dateFormat':
        return this.applyDateFormat(value, config.options as DateFormatOptions);
      case 'numberFormat':
        return this.applyNumberFormat(value, config.options as NumberFormatOptions);
      case 'replace':
        return this.applyReplace(value, config.options as ReplaceOptions);
      case 'split':
        return this.applySplit(value, config.options as SplitOptions);
      case 'join':
        return this.applyJoin(value, config.options as JoinOptions);
      case 'substring':
        return this.applySubstring(value, config.options as SubstringOptions);
      case 'pad':
        return this.applyPad(value, config.options as PadOptions);
      case 'template':
        return this.applyTemplate(value, config.options as TemplateOptions, product);
      case 'lookup':
        return this.applyLookup(value, config.options as LookupOptions);
      case 'math':
        return this.applyMath(value, config.options as MathOptions);
      default:
        return value;
    }
  }

  private isSimpleTransform(type: string): boolean {
    const simpleTransforms: FieldTransform[] = [
      'uppercase', 'lowercase', 'capitalize', 'capitalizeWords',
      'trim', 'trimStart', 'trimEnd', 'slug', 'stripHtml',
      'centsToDecimal', 'decimalToCents', 'round', 'floor', 'ceil', 'abs',
      'boolean', 'number', 'string', 'array', 'json',
      'isoDate', 'timestamp',
    ];
    return simpleTransforms.includes(type as FieldTransform);
  }

  private applyDateFormat(value: unknown, options: DateFormatOptions): string | unknown {
    if (!options) return value;

    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else {
      return value;
    }

    if (isNaN(date.getTime())) return value;

    // Simple format patterns
    const format = options.outputFormat;
    const pad = (n: number) => n.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  private applyNumberFormat(value: unknown, options: NumberFormatOptions): string | unknown {
    if (typeof value !== 'number' || !options) return value;

    const decimals = options.decimals ?? 2;
    const thousandsSep = options.thousandsSeparator ?? ',';
    const decimalSep = options.decimalSeparator ?? '.';

    const parts = value.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

    let result = parts.join(decimalSep);
    if (options.prefix) result = options.prefix + result;
    if (options.suffix) result = result + options.suffix;

    return result;
  }

  private applyReplace(value: unknown, options: ReplaceOptions): string | unknown {
    if (typeof value !== 'string' || !options) return value;

    if (options.regex) {
      const flags = (options.global ? 'g' : '') + (options.caseInsensitive ? 'i' : '');
      try {
        const regex = new RegExp(options.search, flags);
        return value.replace(regex, options.replace);
      } catch {
        return value;
      }
    }

    if (options.global) {
      return value.split(options.search).join(options.replace);
    }
    return value.replace(options.search, options.replace);
  }

  private applySplit(value: unknown, options: SplitOptions): string | string[] | unknown {
    if (typeof value !== 'string' || !options) return value;

    const parts = value.split(options.delimiter, options.limit);
    if (options.index !== undefined) {
      return parts[options.index] ?? '';
    }
    return parts;
  }

  private applyJoin(value: unknown, options: JoinOptions): string | unknown {
    if (!Array.isArray(value) || !options) return value;
    return value.join(options.delimiter);
  }

  private applySubstring(value: unknown, options: SubstringOptions): string | unknown {
    if (typeof value !== 'string' || !options) return value;
    return value.substring(options.start, options.end);
  }

  private applyPad(value: unknown, options: PadOptions): string | unknown {
    if (!options) return value;

    const str = String(value);
    const char = options.char ?? ' ';

    if (options.position === 'end') {
      return str.padEnd(options.length, char);
    }
    return str.padStart(options.length, char);
  }

  private applyTemplate(
    value: unknown,
    options: TemplateOptions,
    product?: ExternalProduct,
  ): string | unknown {
    if (!options?.template) return value;

    let result = options.template;

    // Replace {{field}} patterns with product values
    result = result.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, field) => {
      if (product) {
        const fieldValue = this.getNestedValue(product, field);
        return fieldValue !== undefined ? String(fieldValue) : '';
      }
      return '';
    });

    return result;
  }

  private applyLookup(value: unknown, options: LookupOptions): unknown {
    if (!options?.map) return value;

    const key = String(value);
    return options.map[key] ?? options.default ?? value;
  }

  private applyMath(value: unknown, options: MathOptions): number | unknown {
    if (typeof value !== 'number' || !options) return value;

    switch (options.operation) {
      case 'add':
        return value + options.operand;
      case 'subtract':
        return value - options.operand;
      case 'multiply':
        return value * options.operand;
      case 'divide':
        return options.operand !== 0 ? value / options.operand : value;
      case 'modulo':
        return value % options.operand;
      default:
        return value;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Validate a field value against validation rules
   */
  validateField(
    fieldName: string,
    value: unknown,
    rules: FieldValidationRule[],
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const error = this.validateRule(fieldName, value, rule);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  private validateRule(
    fieldName: string,
    value: unknown,
    rule: FieldValidationRule,
  ): ValidationError | null {
    const { type, value: ruleValue, message } = rule;

    switch (type) {
      case 'required':
        if (value === null || value === undefined || value === '') {
          return {
            field: fieldName,
            rule: type,
            message: message ?? `${fieldName} is required`,
            value,
          };
        }
        break;

      case 'minLength':
        if (typeof value === 'string' && typeof ruleValue === 'number' && value.length < ruleValue) {
          return {
            field: fieldName,
            rule: type,
            message: message ?? `${fieldName} must be at least ${ruleValue} characters`,
            value,
          };
        }
        break;

      case 'maxLength':
        if (typeof value === 'string' && typeof ruleValue === 'number' && value.length > ruleValue) {
          return {
            field: fieldName,
            rule: type,
            message: message ?? `${fieldName} must be no more than ${ruleValue} characters`,
            value,
          };
        }
        break;

      case 'min':
        if (typeof value === 'number' && typeof ruleValue === 'number' && value < ruleValue) {
          return {
            field: fieldName,
            rule: type,
            message: message ?? `${fieldName} must be at least ${ruleValue}`,
            value,
          };
        }
        break;

      case 'max':
        if (typeof value === 'number' && typeof ruleValue === 'number' && value > ruleValue) {
          return {
            field: fieldName,
            rule: type,
            message: message ?? `${fieldName} must be no more than ${ruleValue}`,
            value,
          };
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && typeof ruleValue === 'string') {
          try {
            if (!new RegExp(ruleValue).test(value)) {
              return {
                field: fieldName,
                rule: type,
                message: message ?? `${fieldName} does not match required pattern`,
                value,
              };
            }
          } catch {
            // Invalid regex, skip validation
          }
        }
        break;

      case 'email':
        if (typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return {
              field: fieldName,
              rule: type,
              message: message ?? `${fieldName} must be a valid email address`,
              value,
            };
          }
        }
        break;

      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value);
          } catch {
            return {
              field: fieldName,
              rule: type,
              message: message ?? `${fieldName} must be a valid URL`,
              value,
            };
          }
        }
        break;

      case 'enum':
        if (Array.isArray(ruleValue) && !ruleValue.includes(value)) {
          return {
            field: fieldName,
            rule: type,
            message: message ?? `${fieldName} must be one of: ${ruleValue.join(', ')}`,
            value,
          };
        }
        break;
    }

    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }

  /**
   * Validate all mappings in a batch and return aggregated results
   */
  validateBatch(
    products: ExternalProduct[],
    mappings: FieldMapping[],
  ): { product: ExternalProduct; validation: ValidationResult }[] {
    return products.map((product) => {
      const { validation } = this.applyMappings(product, mappings);
      return { product, validation };
    });
  }
}
