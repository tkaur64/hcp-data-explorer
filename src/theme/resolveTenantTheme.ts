import { z } from "zod";

import {
  DEFAULT_THEME,
  TENANT_THEMES,
  type TenantTheme,
} from "../infrastructure/provided/theme-config";

const appNameSchema = z.string().trim().min(1).max(80);

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const radiusSchema = z.number().finite().min(0).max(24);

function parseOrFallback<T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallback: T,
): T {
  const result = schema.safeParse(value);

  return result.success ? result.data : fallback;
}

export function resolveTenantTheme(tenantKey: string): TenantTheme {
  const candidate = TENANT_THEMES[tenantKey] ?? {};

  return {
    appName: parseOrFallback(
      appNameSchema,
      candidate.appName,
      DEFAULT_THEME.appName,
    ),

    primary: parseOrFallback(
      colorSchema,
      candidate.primary,
      DEFAULT_THEME.primary,
    ),

    onPrimary: parseOrFallback(
      colorSchema,
      candidate.onPrimary,
      DEFAULT_THEME.onPrimary,
    ),

    background: parseOrFallback(
      colorSchema,
      candidate.background,
      DEFAULT_THEME.background,
    ),

    surface: parseOrFallback(
      colorSchema,
      candidate.surface,
      DEFAULT_THEME.surface,
    ),

    text: parseOrFallback(colorSchema, candidate.text, DEFAULT_THEME.text),

    radius: parseOrFallback(
      radiusSchema,
      candidate.radius,
      DEFAULT_THEME.radius,
    ),
  };
}

export const TENANT_THEME_KEYS = Object.keys(TENANT_THEMES);
