// PoC-3: validar un board con Ajv; un caso válido y uno inválido.  Uso: npm run poc:ajv
import { boardErrors, validateBoard } from '../src/schemas/validate';

const valid = { id: '123456', name: 'AT - ejemplo', board_kind: 'public', state: 'active' };
const invalid = { id: 123456, name: '', board_kind: 'secret', state: 'active' };

process.stdout.write(`Board válido -> ${validateBoard(valid)}\n`);
process.stdout.write(`Board inválido -> ${validateBoard(invalid)}\n`);
process.stdout.write(`Errores: ${boardErrors()}\n`);
