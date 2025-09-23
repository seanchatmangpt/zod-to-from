/**
 * Sample configuration schema for ZTF CLI testing
 */

import { z } from 'zod';

/**
 * Configuration schema for application settings
 */
export const Config = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().positive('Port must be a positive integer'),
  debug: z.boolean().default(false),
  database: z.object({
    url: z.string().url('Database URL must be valid'),
    pool: z.number().int().positive().default(10),
  }),
  features: z.array(z.string()).default([]),
});

/**
 * Report schema for data analytics
 */
export const Report = z.object({
  title: z.string(),
  date: z.string().datetime(),
  metrics: z.record(z.number()),
  summary: z.string().optional(),
});

/**
 * User schema for user management
 */
export const User = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
  createdAt: z.string().datetime(),
});

/**
 * CSV data schema for testing
 */
export const CsvData = z.array(
  z.object({
    name: z.string(),
    age: z.coerce.number(),
    active: z.coerce.boolean(),
  })
);
