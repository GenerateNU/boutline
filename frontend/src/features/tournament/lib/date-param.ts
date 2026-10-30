import { format, isValid, parse } from "date-fns";

const dateParamFormat = "yyyy-MM-dd";

export function parseDateParam(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = parse(value, dateParamFormat, new Date());
  return isValid(date) ? date : undefined;
}

export function formatDateParam(date: Date): string {
  return format(date, dateParamFormat);
}
