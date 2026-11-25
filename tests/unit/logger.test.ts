import fs from 'fs';
import path from 'path';
import { LOG_FILES, Logger, redact, testIdFromName } from '../../src/logger/Logger';
import { tempDir, withEnv } from './helpers';

describe('Logger (convenciones del equipo)', () => {
  let dir: string;
  let restoreEnv: () => void;
  const readJson = (): Array<Record<string, unknown>> =>
    fs
      .readFileSync(path.join(dir, LOG_FILES.json), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));

  beforeEach(() => {
    Logger.reset();
    dir = tempDir('log-');
    restoreEnv = withEnv({ LOG_DIR: dir, LOG_LEVEL: 'debug', LOG_CONSOLE_LEVEL: 'error' });
  });

  afterEach(() => {
    Logger.reset();
    restoreEnv();
  });

  it('escribe en los dos archivos con el formato timestamp | nivel | componente | prueba | mensaje', () => {
    Logger.setTestScope('TC-BOARDS-001');
    Logger.for('Demo').info('hola mundo', { extra: 1 });

    const text = fs.readFileSync(path.join(dir, LOG_FILES.text), 'utf8').trim();
    expect(text).toMatch(
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z \| INFO {2}\| Demo \| TC-BOARDS-001 \| hola mundo \{"extra":1\}$/
    );
    const [entry] = readJson();
    expect(entry).toMatchObject({
      level: 'info',
      component: 'Demo',
      testId: 'TC-BOARDS-001',
      message: 'hola mundo',
      extra: 1
    });
  });

  it('respeta el nivel configurado: con LOG_LEVEL=info no escribe debug', () => {
    Logger.reset();
    const restore = withEnv({ LOG_LEVEL: 'info' });
    const log = Logger.for('Demo');
    log.debug('detalle');
    log.warn('aviso');
    restore();
    expect(readJson().map((e) => e.level)).toEqual(['warn']);
  });

  it('enmascara claves sensibles (token, authorization, password)', () => {
    Logger.for('Demo').info('login', {
      token: 'abc123',
      nested: { Authorization: 'xyz', ok: 'visible' }
    });
    const raw = fs.readFileSync(path.join(dir, LOG_FILES.json), 'utf8');
    expect(raw).not.toContain('abc123');
    expect(raw).not.toContain('xyz');
    expect(raw).toContain('[REDACTED]');
    expect(raw).toContain('visible');
  });

  it('redact() trabaja con arreglos y valores simples', () => {
    expect(redact([{ password: 'p' }, 'texto', 5])).toEqual([
      { password: '[REDACTED]' },
      'texto',
      5
    ]);
  });

  it('testIdFromName extrae el identificador corto de la prueba', () => {
    expect(testIdFromName('Boards: create TC-BOARDS-001: algo')).toBe('TC-BOARDS-001');
    expect(testIdFromName('Boards: authorization AUTH-001: algo')).toBe('AUTH-001');
    expect(testIdFromName('dataset: names DS-NAME-003: algo')).toBe('DS-NAME-003');
    expect(testIdFromName('Boards: E2E create step 3: rename')).toBe('E2E step 3');
    expect(testIdFromName(undefined)).toBe('-');
  });
});
