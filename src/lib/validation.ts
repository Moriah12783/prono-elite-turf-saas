export type FeedbackTone = "success" | "error";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function assertRequiredString(value: FormDataEntryValue | null, label: string, maxLength = 255) {
  const stringValue = value?.toString().trim() ?? "";

  if (!stringValue) {
    throw new ValidationError(`${label} est requis.`);
  }

  if (stringValue.length > maxLength) {
    throw new ValidationError(`${label} est trop long.`);
  }

  return stringValue;
}

export function parseOptionalString(value: FormDataEntryValue | null, maxLength = 255) {
  const stringValue = value?.toString().trim() ?? "";

  if (!stringValue) {
    return null;
  }

  if (stringValue.length > maxLength) {
    throw new ValidationError(`La valeur saisie est trop longue.`);
  }

  return stringValue;
}

export function parseInteger(value: FormDataEntryValue | null, label: string, options?: { min?: number; max?: number }) {
  const parsed = Number(assertRequiredString(value, label));

  if (!Number.isInteger(parsed)) {
    throw new ValidationError(`${label} doit etre un entier.`);
  }

  if (options?.min !== undefined && parsed < options.min) {
    throw new ValidationError(`${label} doit etre superieur ou egal a ${options.min}.`);
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw new ValidationError(`${label} doit etre inferieur ou egal a ${options.max}.`);
  }

  return parsed;
}

export function parseOptionalInteger(value: FormDataEntryValue | null, label: string, options?: { min?: number; max?: number }) {
  if (!value || !value.toString().trim()) {
    return null;
  }

  return parseInteger(value, label, options);
}

export function parseOptionalFloat(value: FormDataEntryValue | null, label: string, options?: { min?: number; max?: number }) {
  if (!value || !value.toString().trim()) {
    return null;
  }

  const parsed = Number(value.toString());

  if (Number.isNaN(parsed)) {
    throw new ValidationError(`${label} doit etre numerique.`);
  }

  if (options?.min !== undefined && parsed < options.min) {
    throw new ValidationError(`${label} doit etre superieur ou egal a ${options.min}.`);
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw new ValidationError(`${label} doit etre inferieur ou egal a ${options.max}.`);
  }

  return parsed;
}

export function parseBoolean(value: FormDataEntryValue | null) {
  return value?.toString() === "on" || value?.toString() === "true";
}

export function parseDate(value: FormDataEntryValue | null, label: string) {
  const date = new Date(assertRequiredString(value, label));

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${label} est invalide.`);
  }

  return date;
}

export function parseTime(value: FormDataEntryValue | null, label: string) {
  const time = assertRequiredString(value, label, 5);

  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new ValidationError(`${label} doit respecter le format HH:MM.`);
  }

  return time;
}

export function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

export function parseJsonArray(value: FormDataEntryValue | null, label: string) {
  const raw = assertRequiredString(value, label, 500);
  const parts = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parts.length) {
    throw new ValidationError(`${label} doit contenir au moins une valeur.`);
  }

  return parts;
}

export function asStringValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEnumValue<T extends string>(
  value: FormDataEntryValue | null,
  label: string,
  allowedValues: readonly T[]
) {
  const selected = assertRequiredString(value, label) as T;

  if (!allowedValues.includes(selected)) {
    throw new ValidationError(`${label} est invalide.`);
  }

  return selected;
}
