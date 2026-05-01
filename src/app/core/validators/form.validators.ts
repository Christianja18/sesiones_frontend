import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function notBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return String(value).trim().length > 0 ? null : { blank: true };
}

export function positiveIntegerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? null : { positiveInteger: true };
}

export function positiveIntegerListValidator(required: boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const tokens = integerTokens(control.value);
    if (tokens.length === 0) {
      return required ? { requiredList: true } : null;
    }

    const invalid = tokens.some((token) => !/^[1-9]\d*$/.test(token));
    return invalid ? { positiveIntegerList: true } : null;
  };
}

export function requiredLinesValidator(control: AbstractControl): ValidationErrors | null {
  return textLines(control.value).length > 0 ? null : { requiredList: true };
}

export function dateRangeValidator(startKey: string, endKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const start = control.get(startKey)?.value;
    const end = control.get(endKey)?.value;

    if (!start || !end) {
      return null;
    }

    return String(end) >= String(start) ? null : { dateRange: true };
  };
}

export function enumValueValidator<T extends string>(allowedValues: readonly T[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    return allowedValues.includes(String(value) as T) ? null : { enumValue: true };
  };
}

export function pdfFileNameValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return String(value).trim().toLowerCase().endsWith('.pdf') ? null : { pdfFileName: true };
}

export function httpUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    const url = new URL(String(value).trim());
    const validProtocol = url.protocol === 'http:' || url.protocol === 'https:';
    return validProtocol && url.hostname.length > 0 ? null : { httpUrl: true };
  } catch {
    return { httpUrl: true };
  }
}

export function textLines(value: unknown): string[] {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function integerList(value: unknown): number[] {
  return integerTokens(value).map((token) => Number(token));
}

function integerTokens(value: unknown): string[] {
  return String(value ?? '')
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
