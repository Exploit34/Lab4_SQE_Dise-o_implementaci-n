// PoC-4: token inválido explícito, sin heredar el válido.  Uso: npm run poc:invalid-token
import 'dotenv/config';
import { BoardService } from '../src/services/BoardService';

(async () => {
  const { status, body } = await new BoardService().getById('999999999', 'invalid');
  process.stdout.write(`Estado HTTP: ${status}\n`);
  process.stdout.write(`Errores: ${JSON.stringify(body.errors)}\n`);
})().catch((error: Error) => {
  process.stderr.write(`No se pudo conectar con la API: ${error.message}\n`);
  process.exit(1);
});
