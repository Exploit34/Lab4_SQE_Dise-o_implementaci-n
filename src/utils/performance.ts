import { config } from '../config';
import { Logger } from '../logger/Logger';

const log = Logger.for('Performance');

/** Advierte si la respuesta supera el límite; no hace fallar la prueba (igual que en Postman). */
export function warnIfSlow(label: string, ms: number): void {
  if (ms > config.responseTimeLimitMs) {
    log.warn(`[lento] ${label}: ${ms} ms (objetivo ${config.responseTimeLimitMs} ms)`, {
      event: 'slow_response',
      ms,
      limit: config.responseTimeLimitMs
    });
  }
}
