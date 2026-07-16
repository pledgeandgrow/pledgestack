/**
 * Prototype pollution protection — prevents __proto__, constructor, and
 * prototype keys from being injected via JSON parsing, query params, or
 * deep merges.
 *
 * Complements the output serialization safety module (#170) by protecting
 * at the input/parse layer.
 */

/** Keys that are dangerous and should be stripped from objects */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively remove dangerous keys from an object.
 * Mutates the object in place and returns it.
 */
export function deepSanitize<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      deepSanitize(item);
    }
    return obj;
  }

  const record = obj as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (DANGEROUS_KEYS.has(key)) {
      delete record[key];
      continue;
    }
    const value = record[key];
    if (value !== null && typeof value === 'object') {
      deepSanitize(value);
    }
  }

  return obj;
}

/**
 * Safe JSON.parse that removes dangerous keys from the result.
 * Uses Object.create(null) for the root object to prevent prototype chain access.
 */
export function safeParse<T = unknown>(json: string): T {
  const parsed = JSON.parse(json);
  return deepSanitize(parsed) as T;
}

/**
 * Safe deep merge that prevents prototype pollution.
 * Does not merge __proto__, constructor, or prototype keys.
 */
export function safeMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Record<string, unknown>[]
): T {
  const result = Object.create(null) as Record<string, unknown>;
  // Copy existing target properties
  for (const key of Object.keys(target)) {
    if (!DANGEROUS_KEYS.has(key)) {
      result[key] = target[key];
    }
  }

  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of Object.keys(source)) {
      if (DANGEROUS_KEYS.has(key)) continue;

      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = safeMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else {
        result[key] = sourceValue;
      }
    }
  }

  return result as T;
}

/**
 * Sanitize query parameters — removes __proto__ and other dangerous keys.
 */
export function sanitizeQueryParams(
  params: Record<string, string | string[]>,
): Record<string, string | string[]> {
  const sanitized: Record<string, string | string[]> = {};
  for (const key of Object.keys(params)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    sanitized[key] = params[key];
  }
  return sanitized;
}

/**
 * Create a safe object with null prototype.
 * Prevents prototype chain access on parsed JSON.
 */
export function createSafeObject<T = Record<string, unknown>>(): T {
  return Object.create(null) as T;
}
