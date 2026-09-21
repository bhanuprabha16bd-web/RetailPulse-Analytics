import { reportTypes } from './types';

export function reportLabel(value: string) {
  return reportTypes.find((type) => type.value === value)?.label || value;
}

export function humanize(value: string) {
  return value.replace(/_/g, ' ');
}
