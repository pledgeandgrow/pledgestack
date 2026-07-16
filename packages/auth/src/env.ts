export interface EnvSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'url';
    required?: boolean;
    default?: unknown;
    min?: number;
    max?: number;
    pattern?: string;
    /** If true, value is safe to expose to client (default: false) */
    public?: boolean;
  };
}

export interface EnvValidationResult {
  valid: boolean;
  errors: Array<{ key: string; message: string }>;
  values: Record<string, unknown>;
  publicValues: Record<string, string>;
}

export function validateEnv(schema: EnvSchema, source: Record<string, string | undefined> = process.env): EnvValidationResult {
  const errors: Array<{ key: string; message: string }> = [];
  const values: Record<string, unknown> = {};
  const publicValues: Record<string, string> = {};

  for (const [key, rules] of Object.entries(schema)) {
    const raw = source[key];

    if (raw === undefined || raw === '') {
      if (rules.required && rules.default === undefined) {
        errors.push({ key, message: `${key} is required but not set` });
        continue;
      }
      if (rules.default !== undefined) {
        values[key] = rules.default;
        if (rules.public) {
          publicValues[`PUBLIC_${key}`] = String(rules.default);
        }
        continue;
      }
      continue;
    }

    let value: unknown = raw;

    if (rules.type === 'number') {
      value = Number(raw);
      if (isNaN(value as number)) {
        errors.push({ key, message: `${key} must be a number` });
        continue;
      }
      if (rules.min !== undefined && (value as number) < rules.min) {
        errors.push({ key, message: `${key} must be at least ${rules.min}` });
      }
      if (rules.max !== undefined && (value as number) > rules.max) {
        errors.push({ key, message: `${key} must be at most ${rules.max}` });
      }
    } else if (rules.type === 'boolean') {
      value = raw === 'true' || raw === '1' || raw === 'yes';
    } else if (rules.type === 'url') {
      try {
        new URL(raw);
      } catch {
        errors.push({ key, message: `${key} must be a valid URL` });
        continue;
      }
    } else if (rules.type === 'string') {
      if (rules.min !== undefined && raw.length < rules.min) {
        errors.push({ key, message: `${key} must be at least ${rules.min} characters` });
      }
      if (rules.max !== undefined && raw.length > rules.max) {
        errors.push({ key, message: `${key} must be at most ${rules.max} characters` });
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(raw)) {
        errors.push({ key, message: `${key} does not match required pattern` });
      }
    }

    values[key] = value;

    if (rules.public) {
      publicValues[`PUBLIC_${key}`] = raw;
    }
  }

  return { valid: errors.length === 0, errors, values, publicValues };
}

export function getPublicEnv(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('PUBLIC_') && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function isPublicEnvKey(key: string): boolean {
  return key.startsWith('PUBLIC_');
}

export function createEnvGuard(schema: EnvSchema) {
  const result = validateEnv(schema);
  if (!result.valid) {
    const messages = result.errors.map((e) => `  - ${e.key}: ${e.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }
  return {
    get(key: keyof typeof schema): unknown {
      return result.values[key as string];
    },
    public: result.publicValues,
    all: result.values,
  };
}
