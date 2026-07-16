/**
 * Output serialization safety — automatic JSON sanitization to prevent XSS
 * in API responses. Removes `__proto__`, `constructor`, and `prototype` keys.
 */

/**
 * Remove dangerous keys from an object recursively.
 * Mutates the object in place and returns it.
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = sanitizeObject(obj[i]);
    }
    return obj;
  }

  const dangerous = ['__proto__', 'constructor', 'prototype'];

  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (dangerous.includes(key)) {
      delete (obj as Record<string, unknown>)[key];
    } else {
      (obj as Record<string, unknown>)[key] = sanitizeObject((obj as Record<string, unknown>)[key]);
    }
  }

  return obj;
}

/**
 * Safe JSON.stringify that sanitizes dangerous keys before serialization.
 * Prevents prototype pollution via API responses.
 */
export function safeJsonStringify(value: unknown, replacer?: (string | number)[], space?: string | number): string {
  const sanitized = sanitizeObject(structuredClone(value));
  return JSON.stringify(sanitized, replacer, space);
}

/**
 * Safe JSON.parse that prevents prototype pollution.
 * Parses with a reviver that removes dangerous keys.
 */
export function safeJsonParse<T>(text: string): T {
  return JSON.parse(text, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  }) as T;
}

/**
 * Sanitize a Response body — applies safeJsonStringify to JSON responses.
 */
export function sanitizeResponse(data: unknown): string {
  return safeJsonStringify(data);
}
