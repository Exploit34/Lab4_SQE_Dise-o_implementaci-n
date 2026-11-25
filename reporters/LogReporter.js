require('ts-node/register/transpile-only');
const fs = require('fs');
const path = require('path');
const { config } = require('../src/config');
const { Logger, LOG_FILES, testIdFromName } = require('../src/logger/Logger');
const { generateLogReport } = require('../src/reporting/logReport');

const log = Logger.for('TestRunner');
const API_DIR = `${path.sep}tests${path.sep}boards${path.sep}`;
const isApiTest = (file) => typeof file === 'string' && file.includes(API_DIR);

class LogReporter {
  constructor() {
    this.started = false;
  }

  onTestFileStart(test) {
    if (this.started || !isApiTest(test.path)) return;
    this.started = true;
    fs.mkdirSync(config.logDir, { recursive: true });
    for (const file of Object.values(LOG_FILES)) {
      fs.writeFileSync(path.join(config.logDir, file), '');
    }
    Logger.setTestScope(undefined);
    log.info('inicia la corrida de pruebas de API', { env: config.envName });
  }

  onTestCaseResult(test, result) {
    if (!isApiTest(test.path)) return;
    const name = result.fullName || result.title;
    Logger.setTestScope(testIdFromName(name));
    const meta = { event: 'test_end', result: result.status, ms: result.duration ?? 0 };
    if (result.status === 'failed') {
      log.error(`falló: ${name}`, {
        ...meta,
        failure: (result.failureMessages[0] || '').split('\n')[0]
      });
    } else {
      log.info(`${result.status}: ${name}`, meta);
    }
    Logger.setTestScope(undefined);
  }

  onRunComplete(_contexts, results) {
    if (!this.started) return;
    log.info('fin de la corrida', {
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      skipped: results.numPendingTests
    });
    const out = generateLogReport(config.logDir, path.resolve(__dirname, '../reports'));
    if (out) process.stdout.write(`\nReporte de logs: ${out.html}\n`);
  }
}

module.exports = LogReporter;
