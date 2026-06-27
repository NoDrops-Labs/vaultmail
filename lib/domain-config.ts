export type MasterDomainConfig = {
  owner: string;
  domain: string;
  allowRoot: boolean;
  subdomains: string[];
};

export const expandDomains = (config: MasterDomainConfig[]): string[] =>
  config.flatMap((entry) => {
    const subs = entry.subdomains.map((label) => `${label}.${entry.domain}`);
    return entry.allowRoot ? [entry.domain, ...subs] : subs;
  });

export const isDomainInConfig = (
  domain: string,
  config: MasterDomainConfig[]
): boolean => {
  const expanded = new Set(
    expandDomains(config).map((d) => d.toLowerCase())
  );
  return expanded.has(domain.toLowerCase().trim());
};
