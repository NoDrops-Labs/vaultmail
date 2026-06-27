import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LOCALES,
  getTranslations,
  getRetentionOptions,
} from '@/lib/i18n';

describe('SUPPORTED_LOCALES', () => {
  it('includes en and id', () => {
    expect(SUPPORTED_LOCALES).toContain('en');
    expect(SUPPORTED_LOCALES).toContain('id');
  });

  it('has exactly two locales', () => {
    expect(SUPPORTED_LOCALES.length).toBe(2);
  });
});

describe('getTranslations', () => {
  it('returns English translations for "en"', () => {
    const t = getTranslations('en');
    expect(t.appName).toBe('NoDrops Mail');
    expect(t.heroTitle).toBe('Temp Mail');
    expect(typeof t.inboxTitle).toBe('string');
  });

  it('returns Indonesian translations for "id"', () => {
    const t = getTranslations('id');
    expect(t.appName).toBe('NoDrops Mail');
    expect(t.greetingMorning).toBe('Selamat pagi');
    expect(typeof t.inboxTitle).toBe('string');
  });

  it('falls back to English for unsupported locale', () => {
    // @ts-expect-error — intentionally invalid locale
    const t = getTranslations('fr');
    expect(t.appName).toBe('NoDrops Mail');
    expect(t.greetingMorning).toBe('Good morning');
  });

  it('en and id have the same keys', () => {
    const en = getTranslations('en');
    const id = getTranslations('id');
    const enKeys = Object.keys(en).sort();
    const idKeys = Object.keys(id).sort();
    expect(enKeys).toEqual(idKeys);
  });

  it('retentionOptions sub-object has same keys in both locales', () => {
    const en = getTranslations('en').retentionOptions;
    const id = getTranslations('id').retentionOptions;
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
  });
});

describe('getRetentionOptions', () => {
  it('returns 5 options', () => {
    const opts = getRetentionOptions('en');
    expect(opts.length).toBe(5);
  });

  it('each option has label and value', () => {
    const opts = getRetentionOptions('en');
    for (const opt of opts) {
      expect(typeof opt.label).toBe('string');
      expect(typeof opt.value).toBe('number');
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });

  it('returns expected values for 30m, 1h, 24h, 3d, 1w', () => {
    const opts = getRetentionOptions('en');
    const values = opts.map((o) => o.value);
    expect(values).toEqual([1800, 3600, 86400, 259200, 604800]);
  });

  it('localizes labels for "id"', () => {
    const en = getRetentionOptions('en');
    const id = getRetentionOptions('id');
    expect(id[0].label).not.toBe(en[0].label);
    expect(id[0].label).toBe('30 Menit');
  });
});
