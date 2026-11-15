import { format, isValid, parse } from "date-fns";

const DATE_PARAM_FORMAT = "yyyy-MM-dd";

export function parseDateParam(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = parse(value, DATE_PARAM_FORMAT, new Date());
  return isValid(date) ? date : undefined;
}

export function formatDateParam(date: Date): string {
  return format(date, DATE_PARAM_FORMAT);
}
