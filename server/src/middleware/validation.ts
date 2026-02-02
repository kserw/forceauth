import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Org registration schema
export const orgRegistrationSchema = z.object({
  orgName: z.string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must be less than 255 characters')
    .trim(),
  environment: z.enum(['production', 'sandbox']).optional().default('production'),
  clientId: z.string()
    .min(1, 'Client ID is required')
    .max(255, 'Client ID must be less than 255 characters')
    .trim(),
  clientSecret: z.string()
    .min(1, 'Client Secret is required')
    .max(500, 'Client Secret must be less than 500 characters'),
  redirectUri: z.string()
    .url('Redirect URI must be a valid URL')
    .max(500, 'Redirect URI must be less than 500 characters')
    .optional(),
});

// Org sharing schema
export const orgSharingSchema = z.object({
  shared: z.boolean({ message: 'shared (boolean) is required' }),
});

// Tracked integration schema
export const trackedIntegrationSchema = z.object({
  appName: z.string()
    .min(1, 'App name is required')
    .max(255, 'App name must be less than 255 characters')
    .trim(),
  contact: z.string().max(255).optional().default(''),
  contactId: z.string().max(64).nullable().optional(),
  sfUsername: z.string().max(255).optional().default(''),
  sfUserId: z.string().max(64).nullable().optional(),
  profile: z.string().max(255).optional().default(''),
  inRetool: z.boolean().optional().default(false),
  hasIpRanges: z.boolean().optional().default(false),
  notes: z.string().max(5000).optional().default(''),
  ipRanges: z.array(z.string().regex(/^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/)).optional().default([]),
  status: z.enum(['done', 'in_progress', 'pending', 'blocked']).optional().default('pending'),
});

// Tracked integration update schema (all fields optional)
export const trackedIntegrationUpdateSchema = trackedIntegrationSchema.partial();

// Integration share schema
export const integrationShareSchema = z.object({
  sharedWithUserId: z.string()
    .min(1, 'User ID is required')
    .max(64, 'User ID must be less than 64 characters'),
  permission: z.enum(['view', 'edit']).optional().default('view'),
});

// CSV import schema
export const csvImportSchema = z.object({
  csvContent: z.string()
    .min(1, 'CSV content is required')
    .max(1000000, 'CSV content must be less than 1MB'),
});

// Login request schema
export const loginQuerySchema = z.object({
  env: z.enum(['production', 'sandbox']).optional().default('production'),
  returnUrl: z.string().max(500).optional().default('/'),
  popup: z.string().optional(),
  orgId: z.string().max(64).optional(),
});

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create a validation middleware for request body
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Create a validation middleware for query parameters
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }
    // Don't reassign req.query to avoid type issues
    next();
  };
}

/**
 * Create a validation middleware for route parameters
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.issues.map((issue: z.ZodIssue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
      return;
    }
    // Don't reassign req.params to avoid type issues
    next();
  };
}

// =============================================================================
// COMMON PARAM SCHEMAS
// =============================================================================

export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const userIdParamSchema = z.object({
  sharedUserId: z.string().min(1).max(64),
});

// =============================================================================
// INPUT SANITIZATION HELPERS
// =============================================================================

/**
 * Sanitize a string by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML brackets
    .trim();
}

/**
 * Sanitize an object's string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return result;
}
