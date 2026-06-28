const API_BASE = 'https://api.cloudflare.com/client/v4';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

async function cfFetch(method: string, path: string, body?: unknown) {
  const token = getEnv('CLOUDFLARE_API_TOKEN');
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    errors?: Array<{ message: string }>;
    result?: unknown;
  };

  if (!response.ok || !data.success) {
    const message = data.errors?.map((e) => e.message).join(', ') || `HTTP ${response.status}`;
    throw new Error(`Cloudflare API error: ${message}`);
  }

  return data.result;
}

async function getZoneIdByDomain(domain: string): Promise<string> {
  const result = (await cfFetch('GET', `/zones?name=${encodeURIComponent(domain)}`)) as Array<{ id: string; name: string }>;
  const zone = result.find((z) => z.name === domain);
  if (!zone) {
    throw new Error(`Zone not found for domain: ${domain}`);
  }
  return zone.id;
}

async function getCatchAllRule(zoneId: string): Promise<{ id?: string; actions?: unknown[]; enabled?: boolean; name?: string } | null> {
  try {
    return (await cfFetch('GET', `/zones/${zoneId}/email/routing/rules/catch_all`)) as {
      id?: string;
      actions?: unknown[];
      enabled?: boolean;
      name?: string;
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not found') || message.includes('not_found')) {
      return null;
    }
    throw error;
  }
}

async function createCatchAllRule(zoneId: string, workerName: string): Promise<unknown> {
  return cfFetch('POST', `/zones/${zoneId}/email/routing/rules`, {
    name: 'Catch-all to Worker',
    enabled: true,
    matchers: [{ type: 'all' }],
    actions: [{ type: 'worker', value: [workerName] }]
  });
}

async function updateCatchAllRule(zoneId: string, rule: { id?: string }, workerName: string): Promise<unknown> {
  if (!rule.id) {
    throw new Error('Cannot update catch-all rule without an ID');
  }
  return cfFetch('PUT', `/zones/${zoneId}/email/routing/rules/catch_all`, {
    name: 'Catch-all to Worker',
    enabled: true,
    matchers: [{ type: 'all' }],
    actions: [{ type: 'worker', value: [workerName] }]
  });
}

async function main() {
  const domain = process.env.CLOUDFLARE_DOMAIN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID || (domain ? await getZoneIdByDomain(domain) : undefined);
  const workerName = process.env.WORKER_NAME || 'dispomail-forwarder';

  if (!zoneId) {
    throw new Error('Set CLOUDFLARE_DOMAIN or CLOUDFLARE_ZONE_ID');
  }

  console.log(`Setting up catch-all routing for zone ${zoneId} → worker ${workerName}`);

  const rule = await getCatchAllRule(zoneId);
  if (rule) {
    console.log('Existing catch-all rule found, updating...');
    await updateCatchAllRule(zoneId, rule, workerName);
  } else {
    console.log('No existing catch-all rule, creating...');
    await createCatchAllRule(zoneId, workerName);
  }

  console.log('Catch-all routing configured successfully.');
}

main().catch((error) => {
  console.error('Setup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
