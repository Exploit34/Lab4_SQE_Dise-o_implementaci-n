import Ajv from 'ajv';
import { boardSchema } from './board.schema';

// El validador se compila una sola vez y se reutiliza en todas las pruebas.
const ajv = new Ajv({ allErrors: true });
export const validateBoard = ajv.compile(boardSchema);

/** Devuelve los errores del último validateBoard en texto, útil para mensajes de fallo. */
export function boardErrors(): string {
  return ajv.errorsText(validateBoard.errors);
}
