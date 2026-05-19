import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

type ValidationRule = {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'array';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  allowedValues?: string[];
};

export function validate(rules: ValidationRule[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const rule of rules) {
      const value = req.body[rule.field];

      if (rule.required && (value === undefined || value === null || value === '')) {
        throw new AppError(400, `${rule.field} is required`);
      }

      if (value === undefined || value === null) continue;

      if (rule.type === 'number' && typeof value !== 'number') {
        throw new AppError(400, `${rule.field} must be a number`);
      }

      if (rule.type === 'string' && typeof value !== 'string') {
        throw new AppError(400, `${rule.field} must be a string`);
      }

      if (rule.type === 'array' && !Array.isArray(value)) {
        throw new AppError(400, `${rule.field} must be an array`);
      }

      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        throw new AppError(400, `${rule.field} minimum is ${rule.min}`);
      }

      if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        throw new AppError(400, `${rule.field} maximum is ${rule.max}`);
      }

      if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
        throw new AppError(400, `${rule.field} minimum length is ${rule.minLength}`);
      }

      if (rule.maxLength !== undefined && typeof value === 'string' && value.length > rule.maxLength) {
        throw new AppError(400, `${rule.field} maximum length is ${rule.maxLength}`);
      }

      if (rule.allowedValues && typeof value === 'string' && !rule.allowedValues.includes(value)) {
        throw new AppError(400, `${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
      }
    }
    next();
  };
}
