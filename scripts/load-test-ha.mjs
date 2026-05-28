const API = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';
const TIMEOUT_MS = Number(process.env.LOAD_TIMEOUT_MS ?? 10000);

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function timedFetch(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      ms: performance.now() - started,
      body,
    };
  } catch (error) {
    return {
      ok: false,
      status: error.name === 'AbortError' ? 'timeout' : 'error',
      ms: performance.now() - started,
      body: String(error.message ?? error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runBatch(name, total, concurrency, makeRequest) {
  let cursor = 0;
  const results = [];
  const started = performance.now();

  async function worker() {
    while (cursor < total) {
      const index = cursor++;
      results.push(await makeRequest(index));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  const elapsedSec = (performance.now() - started) / 1000;
  const latencies = results.map((r) => r.ms).filter(Number.isFinite);
  const ok = results.filter((r) => r.ok).length;
  const accepted = results.filter((r) => r.status === 200 || r.status === 201 || r.status === 202).length;
  const backpressure = results.filter((r) => r.status === 503).length;
  const conflicts = results.filter((r) => r.status === 409).length;
  const timeouts = results.filter((r) => r.status === 'timeout').length;
  const statusCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    name,
    total,
    concurrency,
    ok,
    accepted,
    backpressure,
    conflicts,
    timeouts,
    errorRate: Number(((total - ok) / total).toFixed(4)),
    rps: Number((total / elapsedSec).toFixed(1)),
    p50: Math.round(percentile(latencies, 50)),
    p95: Math.round(percentile(latencies, 95)),
    p99: Math.round(percentile(latencies, 99)),
    statusCounts,
  };
}

async function jsonGet(path) {
  const res = await timedFetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${res.body}`);
  return JSON.parse(res.body);
}

async function main() {
  const healthBefore = await jsonGet('/health');
  const menu = await jsonGet('/menu');
  const item = menu.flatMap((category) => category.items).find((menuItem) => menuItem.isAvailable);
  if (!item) throw new Error('No available menu item found for order load test');

  const report = {
    api: API,
    testedAt: new Date().toISOString(),
    itemId: item.id,
    healthBefore,
    tests: [],
  };

  await jsonGet('/menu');
  for (const concurrency of [50, 100, 250, 500]) {
    report.tests.push(
      await runBatch(`menu-read-c${concurrency}`, 1000, concurrency, () => timedFetch(`${API}/menu`)),
    );
  }

  for (const concurrency of [25, 50, 100, 250]) {
    report.tests.push(
      await runBatch(`async-order-c${concurrency}`, 400, concurrency, (i) =>
        timedFetch(`${API}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey: `load-${Date.now()}-${concurrency}-${i}`,
            items: [{ menuItemId: item.id, quantity: 1 }],
            customerNote: `load test c${concurrency}`,
          }),
        }),
      ),
    );
  }

  const duplicateKey = `duplicate-${Date.now()}`;
  report.tests.push(
    await runBatch('duplicate-click-same-key-c100', 100, 100, () =>
      timedFetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: duplicateKey,
          items: [{ menuItemId: item.id, quantity: 1 }],
          customerNote: 'duplicate click test',
        }),
      }),
    ),
  );

  report.tests.push(
    await runBatch('backpressure-probe-c500', 1500, 500, (i) =>
      timedFetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: `pressure-${Date.now()}-${i}`,
          items: [{ menuItemId: item.id, quantity: 1 }],
          customerNote: 'backpressure probe',
        }),
      }),
    ),
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));
  report.healthAfter = await jsonGet('/health');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
