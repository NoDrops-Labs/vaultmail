export const DEFAULT_APP_NAME = 'NoDrops Mail';

export const normalizeAppName = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};
