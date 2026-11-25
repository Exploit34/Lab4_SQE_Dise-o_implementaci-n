import { config } from '../src/config';
import { Logger, testIdFromName } from '../src/logger/Logger';
import { sleep } from '../src/utils/sleep';

const log = Logger.for('Hooks');

// Hook global: se ejecuta en cada archivo de pruebas.
beforeAll(() => {
  if (!config.apiToken) {
    throw new Error('Falta API_TOKEN. Copia .env.example a .env y completa el token.');
  }
  log.info('suite iniciada', { env: config.envName, baseUrl: config.baseUrl });
});

// Todo log emitido durante la prueba queda etiquetado con su identificador (TC-BOARDS-001, etc.).
beforeEach(() => {
  const testId = testIdFromName(expect.getState().currentTestName);
  Logger.setTestScope(testId);
  log.info(`inicia: ${expect.getState().currentTestName}`, { event: 'test_start' });
});

// Hook global (corre después de los afterEach de cada suite): respeta el límite de complejidad.
afterEach(async () => {
  log.debug('esperando antes de la siguiente prueba', { delayMs: config.delayMs });
  await sleep(config.delayMs);
  Logger.setTestScope(undefined);
});
