import http from 'http';
import { AddressInfo } from 'net';
import { RequestManager } from '../../src/core/RequestManager';
import { Logger } from '../../src/logger/Logger';
import { tempDir, withEnv } from './helpers';

describe('RequestManager (patrón Singleton)', () => {
  let server: http.Server;
  let restoreEnv: () => void;
  const seenAuth: Array<string | undefined> = [];

  beforeAll(async () => {
    // Servidor local que imita la API: 401 si el token no es "good-token"
    server = http.createServer((req, res) => {
      seenAuth.push(req.headers.authorization);
      const ok = req.headers.authorization === 'good-token';
      res.writeHead(ok ? 200 : 401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ok ? { data: { me: { id: '1' } } } : { errors: [{ message: 'no' }] }));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    restoreEnv = withEnv({
      BASE_URL: `http://localhost:${port}`,
      API_TOKEN: 'good-token',
      INVALID_TOKEN: 'bad-token',
      RESTRICTED_TOKEN: undefined,
      LOG_DIR: tempDir('rm-'),
      LOG_CONSOLE_LEVEL: 'error'
    });
  });

  afterAll(async () => {
    Logger.reset();
    restoreEnv();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    RequestManager.resetInstance();
    seenAuth.length = 0;
  });

  it('getInstance() devuelve siempre la misma instancia', () => {
    const a = RequestManager.getInstance();
    const b = RequestManager.getInstance();
    expect(a).toBe(b);
  });

  it('las llamadas "simultáneas" también comparten una sola instancia', () => {
    const instances = Array.from({ length: 20 }, () => RequestManager.getInstance());
    expect(new Set(instances).size).toBe(1);
  });

  it('resetInstance() descarta la instancia y la siguiente llamada crea una nueva', () => {
    const first = RequestManager.getInstance();
    RequestManager.resetInstance();
    expect(RequestManager.getInstance()).not.toBe(first);
  });

  it('el constructor es privado: la única vía de creación es getInstance()', () => {
    // La restricción es de TypeScript (new RequestManager() no compila); aquí se documenta con el tipo.
    // @ts-expect-error constructor privado
    const attempt = (): RequestManager => new RequestManager();
    expect(typeof attempt).toBe('function');
  });

  it('reutiliza el cliente HTTP de cada rol y usa clientes distintos para roles distintos', () => {
    const manager = RequestManager.getInstance();
    expect(manager.getClient('valid')).toBe(manager.getClient('valid'));
    expect(manager.getClient('invalid')).not.toBe(manager.getClient('valid'));
  });

  it('envía el token sin prefijo Bearer y devuelve el cuerpo', async () => {
    const result = await RequestManager.getInstance().send(
      'query { me { id } }',
      {},
      { operation: 'me' }
    );
    expect(result.status).toBe(200);
    expect(result.body.data?.me.id).toBe('1');
    expect(seenAuth).toEqual(['good-token']);
  });

  it('un token inválido devuelve 401 sin lanzar excepción y no hereda el token válido', async () => {
    const result = await RequestManager.getInstance().send(
      'query { me { id } }',
      {},
      { auth: 'invalid', operation: 'me' }
    );
    expect(result.status).toBe(401);
    expect(seenAuth).toEqual(['bad-token']);
  });

  it('acumula estadísticas globales de todas las peticiones', async () => {
    const manager = RequestManager.getInstance();
    await manager.send('query { me { id } }', {}, { operation: 'me' });
    await manager.send('query { me { id } }', {}, { auth: 'invalid', operation: 'me' });
    const stats = manager.getStats();
    expect(stats.total).toBe(2);
    expect(stats.failedHttp).toBe(1);
    expect(stats.graphqlErrors).toBe(1);
    expect(stats.byOperation).toEqual({ me: 2 });
    manager.resetStats();
    expect(manager.getStats().total).toBe(0);
  });

  it('pedir el rol "restricted" sin RESTRICTED_TOKEN lanza un error claro', async () => {
    await expect(
      RequestManager.getInstance().send('query { me { id } }', {}, { auth: 'restricted' })
    ).rejects.toThrow('RESTRICTED_TOKEN');
  });
});
