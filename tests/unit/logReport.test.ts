import fs from 'fs';
import path from 'path';
import { LOG_FILES } from '../../src/logger/Logger';
import {
  generateLogReport,
  parseLog,
  renderHtml,
  renderMarkdown,
  summarize
} from '../../src/reporting/logReport';
import { tempDir } from './helpers';

const line = (o: Record<string, unknown>): string =>
  JSON.stringify({ component: 'X', testId: '-', ...o });

const SAMPLE = [
  line({
    timestamp: '2026-01-01T00:00:03.000Z',
    level: 'error',
    testId: 'TC-1',
    message: 'falló: TC-1',
    event: 'test_end',
    result: 'failed',
    ms: 900
  }),
  line({
    timestamp: '2026-01-01T00:00:01.000Z',
    level: 'info',
    testId: 'TC-1',
    message: '<- create_board',
    event: 'request',
    operation: 'create_board',
    status: 200,
    ms: 300
  }),
  line({
    timestamp: '2026-01-01T00:00:02.000Z',
    level: 'warn',
    testId: 'TC-1',
    message: '<- update_board',
    event: 'request',
    operation: 'update_board',
    status: 403,
    ms: 700
  }),
  line({
    timestamp: '2026-01-01T00:00:04.000Z',
    level: 'info',
    testId: 'TC-2',
    message: 'passed: TC-2',
    event: 'test_end',
    result: 'passed',
    ms: 100
  }),
  'esta línea está dañada y debe ignorarse'
].join('\n');

describe('Reporte de logs', () => {
  const summary = summarize(parseLog(SAMPLE), '2026-01-01T00:00:10.000Z');

  it('parseLog ignora líneas dañadas y ordena por fecha', () => {
    const entries = parseLog(SAMPLE);
    expect(entries).toHaveLength(4);
    expect(entries[0].timestamp < entries[3].timestamp).toBe(true);
  });

  it('summarize cuenta niveles, peticiones y resultado por prueba', () => {
    expect(summary.byLevel).toEqual({ info: 2, warn: 1, error: 1 });
    expect(summary.requests.total).toBe(2);
    expect(summary.requests.avgMs).toBe(500);
    const t1 = summary.tests.find((t) => t.testId === 'TC-1');
    expect(t1).toMatchObject({
      result: 'failed',
      requests: 2,
      warnings: 1,
      errors: 1,
      durationMs: 900
    });
    expect(summary.tests.find((t) => t.testId === 'TC-2')?.result).toBe('passed');
    expect(summary.slowest[0]).toMatchObject({ operation: 'update_board', ms: 700 });
    expect(summary.problems).toHaveLength(2);
  });

  it('renderMarkdown y renderHtml incluyen las pruebas y escapan HTML', () => {
    expect(renderMarkdown(summary)).toContain('| TC-1 | failed | 900 | 2 | 1 | 1 |');
    const html = renderHtml(
      summarize(
        parseLog(
          line({
            timestamp: '2026-01-01T00:00:00.000Z',
            level: 'warn',
            message: '<script>x</script>'
          })
        )
      )
    );
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('generateLogReport escribe el .html y el .md; sin log devuelve undefined', () => {
    const logDir = tempDir('lr-in-');
    const outDir = tempDir('lr-out-');
    expect(generateLogReport(logDir, outDir)).toBeUndefined();
    fs.writeFileSync(path.join(logDir, LOG_FILES.json), SAMPLE);
    const out = generateLogReport(logDir, outDir);
    expect(fs.existsSync(out?.html as string)).toBe(true);
    expect(fs.readFileSync(out?.md as string, 'utf8')).toContain('# Reporte de logs de ejecución');
  });
});
