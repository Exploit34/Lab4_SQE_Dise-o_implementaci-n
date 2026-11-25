// PoC-1: query "me" a través del Singleton RequestManager.  Uso: npm run poc:me
import 'dotenv/config';
import { BoardService } from '../src/services/BoardService';

(async () => {
  const { status, body, ms } = await new BoardService().me();
  process.stdout.write(`Estado HTTP: ${status} (${ms} ms)\n`);
  process.stdout.write(`Usuario: ${JSON.stringify(body.data?.me ?? body.errors)}\n`);
})().catch((error: Error) => {
  process.stderr.write(`No se pudo conectar con la API: ${error.message}\n`);
  process.exit(1);
});
