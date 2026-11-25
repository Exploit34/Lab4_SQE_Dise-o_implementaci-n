// Genera el reporte de logs a partir de logs/execution.jsonl.   Uso: npm run report:logs
import path from 'path';
import { config } from '../src/config';
import { generateLogReport } from '../src/reporting/logReport';

const result = generateLogReport(config.logDir, path.resolve(__dirname, '../reports'));
if (!result) {
  process.stderr.write('No hay logs: ejecuta primero las pruebas (npm test).\n');
  process.exit(1);
}
process.stdout.write(`Reporte generado:\n - ${result.html}\n - ${result.md}\n`);
