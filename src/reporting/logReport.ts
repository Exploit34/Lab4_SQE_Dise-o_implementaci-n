import fs from 'fs';
import path from 'path';
import { LOG_FILES } from '../logger/Logger';

/** Una línea del archivo logs/execution.jsonl */
export interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  component: string;
  testId: string;
  message: string;
  event?: string;
  operation?: string;
  status?: number;
  ms?: number;
  result?: 'passed' | 'failed' | 'skipped';
  [key: string]: unknown;
}

export interface TestSummary {
  testId: string;
  result: 'passed' | 'failed' | 'skipped' | 'unknown';
  durationMs?: number;
  requests: number;
  requestMs: number;
  warnings: number;
  errors: number;
}

export interface LogSummary {
  generatedAt: string;
  totalEntries: number;
  byLevel: Record<string, number>;
  byComponent: Record<string, number>;
  tests: TestSummary[];
  requests: {
    total: number;
    avgMs: number;
    byOperation: Record<string, { count: number; avgMs: number; maxMs: number }>;
  };
  slowest: Array<{ testId: string; operation: string; ms: number }>;
  problems: Array<{
    timestamp: string;
    level: string;
    component: string;
    testId: string;
    message: string;
    detail?: string;
  }>;
}

export function parseLog(content: string): LogEntry[] {
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as LogEntry];
      } catch {
        return []; // una línea dañada no debe impedir generar el reporte
      }
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function summarize(entries: LogEntry[], generatedAt = new Date().toISOString()): LogSummary {
  const byLevel: Record<string, number> = {};
  const byComponent: Record<string, number> = {};
  const tests = new Map<string, TestSummary>();
  const ops: Record<string, { count: number; total: number; max: number }> = {};
  const requestList: Array<{ testId: string; operation: string; ms: number }> = [];

  const testOf = (id: string): TestSummary => {
    let t = tests.get(id);
    if (!t) {
      t = { testId: id, result: 'unknown', requests: 0, requestMs: 0, warnings: 0, errors: 0 };
      tests.set(id, t);
    }
    return t;
  };

  for (const e of entries) {
    byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
    byComponent[e.component] = (byComponent[e.component] ?? 0) + 1;
    const isTest = e.testId && e.testId !== '-';

    if (isTest) {
      const t = testOf(e.testId);
      if (e.level === 'warn') t.warnings += 1;
      if (e.level === 'error') t.errors += 1;
      if (e.event === 'test_end' && e.result) {
        t.result = e.result;
        t.durationMs = typeof e.ms === 'number' ? e.ms : undefined;
      }
    }

    if (e.event === 'request' && e.operation && typeof e.ms === 'number') {
      const o = (ops[e.operation] ??= { count: 0, total: 0, max: 0 });
      o.count += 1;
      o.total += e.ms;
      o.max = Math.max(o.max, e.ms);
      requestList.push({
        testId: isTest ? e.testId : '(sin prueba)',
        operation: e.operation,
        ms: e.ms
      });
      if (isTest) {
        const t = testOf(e.testId);
        t.requests += 1;
        t.requestMs += e.ms;
      }
    }
  }

  const totalMs = requestList.reduce((sum, r) => sum + r.ms, 0);
  return {
    generatedAt,
    totalEntries: entries.length,
    byLevel,
    byComponent,
    tests: [...tests.values()].sort((a, b) => a.testId.localeCompare(b.testId)),
    requests: {
      total: requestList.length,
      avgMs: requestList.length ? Math.round(totalMs / requestList.length) : 0,
      byOperation: Object.fromEntries(
        Object.entries(ops).map(([k, v]) => [
          k,
          { count: v.count, avgMs: Math.round(v.total / v.count), maxMs: v.max }
        ])
      )
    },
    slowest: [...requestList].sort((a, b) => b.ms - a.ms).slice(0, 5),
    problems: entries
      .filter((e) => e.level === 'error' || e.level === 'warn')
      .map((e) => ({
        timestamp: e.timestamp,
        level: e.level,
        component: e.component,
        testId: e.testId,
        message: e.message,
        detail: typeof e.failure === 'string' ? e.failure : undefined
      }))
  };
}

const esc = (s: unknown): string =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
  );

export function renderMarkdown(s: LogSummary): string {
  const lines: string[] = [
    '# Reporte de logs de ejecución',
    '',
    `Generado: ${s.generatedAt}`,
    '',
    '## Resumen',
    '',
    `- Entradas de log: **${s.totalEntries}**`,
    `- Niveles: ${
      Object.entries(s.byLevel)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ') || '-'
    }`,
    `- Peticiones HTTP: **${s.requests.total}** (promedio ${s.requests.avgMs} ms)`,
    '',
    '## Pruebas',
    '',
    '| Prueba | Resultado | Duración (ms) | Peticiones | Warn | Error |',
    '| --- | --- | ---: | ---: | ---: | ---: |',
    ...s.tests.map(
      (t) =>
        `| ${t.testId} | ${t.result} | ${t.durationMs ?? '-'} | ${t.requests} | ${t.warnings} | ${t.errors} |`
    ),
    '',
    '## Peticiones por operación',
    '',
    '| Operación | Cantidad | Promedio (ms) | Máximo (ms) |',
    '| --- | ---: | ---: | ---: |',
    ...Object.entries(s.requests.byOperation).map(
      ([op, v]) => `| ${op} | ${v.count} | ${v.avgMs} | ${v.maxMs} |`
    ),
    '',
    '## Advertencias y errores',
    '',
    ...(s.problems.length
      ? s.problems.map(
          (p) =>
            `- \`${p.level}\` [${p.component}] (${p.testId}) ${p.message}${p.detail ? `\n  - Motivo: ${p.detail}` : ''}`
        )
      : ['Sin advertencias ni errores.'])
  ];
  return `${lines.join('\n')}\n`;
}

export function renderHtml(s: LogSummary): string {
  const badge = (r: string): string => `<span class="b ${esc(r)}">${esc(r)}</span>`;
  const rows = (cells: string[][]): string =>
    cells.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Reporte de logs</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;color:#1b1f24}
h1{margin-bottom:.2rem} .meta{color:#57606a} table{border-collapse:collapse;margin:1rem 0 2rem;width:100%}
th,td{border:1px solid #d0d7de;padding:.4rem .6rem;text-align:left;font-size:.9rem} th{background:#f6f8fa}
.cards{display:flex;gap:1rem;flex-wrap:wrap}.card{border:1px solid #d0d7de;border-radius:8px;padding:.8rem 1.2rem}
.card b{display:block;font-size:1.6rem}
.b{padding:.1rem .5rem;border-radius:1rem;font-size:.8rem}.passed{background:#dafbe1}.failed{background:#ffebe9}
.skipped,.unknown{background:#eaeef2}.warn{color:#9a6700}.error{color:#cf222e}
</style></head><body>
<h1>Reporte de logs de ejecución</h1><div class="meta">Generado: ${esc(s.generatedAt)}</div>
<div class="cards">
<div class="card"><b>${s.totalEntries}</b>entradas de log</div>
<div class="card"><b>${s.requests.total}</b>peticiones HTTP</div>
<div class="card"><b>${s.requests.avgMs} ms</b>promedio por petición</div>
<div class="card"><b>${s.byLevel.warn ?? 0}</b>advertencias</div>
<div class="card"><b>${s.byLevel.error ?? 0}</b>errores</div></div>
<h2>Pruebas</h2><table><tr><th>Prueba</th><th>Resultado</th><th>Duración (ms)</th><th>Peticiones</th><th>Warn</th><th>Error</th></tr>
${rows(s.tests.map((t) => [esc(t.testId), badge(t.result), String(t.durationMs ?? '-'), String(t.requests), String(t.warnings), String(t.errors)]))}</table>
<h2>Peticiones por operación</h2><table><tr><th>Operación</th><th>Cantidad</th><th>Promedio (ms)</th><th>Máximo (ms)</th></tr>
${rows(Object.entries(s.requests.byOperation).map(([op, v]) => [esc(op), String(v.count), String(v.avgMs), String(v.maxMs)]))}</table>
<h2>Las 5 peticiones más lentas</h2><table><tr><th>Prueba</th><th>Operación</th><th>ms</th></tr>
${rows(s.slowest.map((r) => [esc(r.testId), esc(r.operation), String(r.ms)]))}</table>
<h2>Advertencias y errores</h2><table><tr><th>Hora</th><th>Nivel</th><th>Componente</th><th>Prueba</th><th>Mensaje</th></tr>
${s.problems.length ? rows(s.problems.map((p) => [esc(p.timestamp), `<span class="${esc(p.level)}">${esc(p.level)}</span>`, esc(p.component), esc(p.testId), esc(p.detail ? `${p.message} — ${p.detail}` : p.message)])) : '<tr><td colspan="5">Sin advertencias ni errores.</td></tr>'}</table>
</body></html>
`;
}

/** Lee logs/execution.jsonl y escribe reports/log-report.html y reports/log-report.md */
export function generateLogReport(
  logDir: string,
  outDir: string
): { html: string; md: string; summary: LogSummary } | undefined {
  const input = path.join(logDir, LOG_FILES.json);
  if (!fs.existsSync(input)) return undefined;
  const summary = summarize(parseLog(fs.readFileSync(input, 'utf8')));
  fs.mkdirSync(outDir, { recursive: true });
  const html = path.join(outDir, 'log-report.html');
  const md = path.join(outDir, 'log-report.md');
  fs.writeFileSync(html, renderHtml(summary));
  fs.writeFileSync(md, renderMarkdown(summary));
  return { html, md, summary };
}
