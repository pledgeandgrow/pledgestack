import { useState, useCallback, type FormEvent } from 'react';

export interface FormStateOptions<T> {
  initialValues: T;
  onSubmit?: (values: T) => Promise<void> | void;
  validate?: (values: T) => Partial<Record<keyof T, string>> | null;
}

export function useFormState<T extends Record<string, unknown>>(
  options: FormStateOptions<T>,
) {
  const { initialValues, onSubmit, validate } = options;
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = useCallback(
    (field: keyof T) => (value: unknown) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (validate) {
        const validationErrors = validate(values);
        if (validationErrors) {
          setErrors(validationErrors);
          return;
        }
      }
      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
          setIsSubmitted(true);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validate, onSubmit],
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
    setIsSubmitted(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    isSubmitted,
    handleChange,
    handleSubmit,
    reset,
    setValues,
    setErrors,
  };
}

export function useFormStatus() {
  const [pending, setPending] = useState(false);

  const startTransition = useCallback(async (fn: () => Promise<void>) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, startTransition };
}
