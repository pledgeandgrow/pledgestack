import { useState, useCallback, type FormEvent } from 'react';

export interface UseFormActionOptions<T> {
  /** Initial values */
  initialValues: T;
  /** Server action to call */
  action: (values: T) => Promise<unknown>;
  /** Validate before submit */
  validate?: (values: T) => Partial<Record<keyof T, string>> | null;
  /** Reset on success (default: false) */
  resetOnSuccess?: boolean;
}

export function useFormAction<T extends Record<string, unknown>>(
  options: UseFormActionOptions<T>,
) {
  const { initialValues, action, validate, resetOnSuccess = false } = options;
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof T) => (value: unknown) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setSuccess(false);
      setError(null);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();

      if (validate) {
        const validationErrors = validate(values);
        if (validationErrors && Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          return;
        }
      }

      setPending(true);
      setError(null);
      setSuccess(false);

      try {
        await action(values);
        setSuccess(true);
        if (resetOnSuccess) {
          setValues(initialValues);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setPending(false);
      }
    },
    [values, action, validate, resetOnSuccess, initialValues],
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setPending(false);
    setSuccess(false);
    setError(null);
  }, [initialValues]);

  return {
    values,
    errors,
    pending,
    success,
    error,
    handleChange,
    handleSubmit,
    reset,
    setValues,
  };
}

export function useOptimisticAction<T, R>(
  action: (data: T) => Promise<R>,
  options: { rollbackOnError?: boolean } = {},
) {
  const { rollbackOnError = true } = options;
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [result, setResult] = useState<R | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (data: T, optimistic?: T) => {
      setPending(true);
      setError(null);

      if (optimistic !== undefined) {
        setOptimisticData(optimistic);
      }

      try {
        const res = await action(data);
        setResult(res);
        setOptimisticData(null);
        return res;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
        if (rollbackOnError) {
          setOptimisticData(null);
        }
        throw err;
      } finally {
        setPending(false);
      }
    },
    [action, rollbackOnError],
  );

  return { optimisticData, result, pending, error, execute };
}
