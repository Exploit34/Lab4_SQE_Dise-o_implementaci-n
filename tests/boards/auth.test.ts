import { config } from '../../src/config';
import { BoardTracker } from '../../src/helpers/BoardTracker';
import { BoardService } from '../../src/services/BoardService';
import { testName } from '../../src/utils/names';
import { warnIfSlow } from '../../src/utils/performance';

describe('Boards: authorization', () => {
  const boards = new BoardService();

  it('AUTH-001: authorized request with the API token returns the user', async () => {
    const { status, headers, body, ms } = await boards.me();

    expect(status).toBe(200);
    expect(headers['content-type']).toContain('application/json');
    expect(body.errors).toBeUndefined();
    expect(typeof body.data?.me.id).toBe('string');
    expect(body.data?.me.name).toEqual(expect.any(String));
    warnIfSlow('AUTH-001', ms);
  });

  it('TC-BOARDS-011: request with an invalid token is rejected', async () => {
    // El rol "invalid" usa un token falso propio: no hereda el token válido.
    const { status, body } = await boards.getById('999999999', 'invalid');

    expect(status).toBe(401);
    expect(body.errors?.[0].extensions?.code).toBe('NOT_AUTHENTICATED');
    expect(body.data).toBeUndefined();
  });

  // Requiere un token sin permiso boards:write (app OAuth o usuario de solo lectura).
  // Se ejecuta solo si RESTRICTED_TOKEN está definido; si no, queda omitida.
  const maybeIt = config.restrictedToken ? it : it.skip;

  maybeIt('TC-BOARDS-012: operation without boards:write permission is rejected', async () => {
    const tracker = new BoardTracker(boards);
    const result = await boards.create(
      { name: testName('TC012 forbidden board'), kind: 'public' },
      'restricted'
    );
    // Si por error se creó el board, se borra con el token completo.
    tracker.track(result);
    await tracker.cleanup();

    expect(result.body.errors).toBeDefined();
    expect(result.body.data?.create_board ?? null).toBeNull();
  });
});
