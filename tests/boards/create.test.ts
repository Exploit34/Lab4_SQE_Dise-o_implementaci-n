import { config } from '../../src/config';
import { BoardTracker } from '../../src/helpers/BoardTracker';
import { boardErrors, validateBoard } from '../../src/schemas/validate';
import { BoardService } from '../../src/services/BoardService';
import { testName } from '../../src/utils/names';
import { warnIfSlow } from '../../src/utils/performance';
import { registerTrackerCleanup } from '../support/fixtures';

describe('Boards: create_board', () => {
  const boards = new BoardService();
  const tracker = new BoardTracker(boards);

  // Postcondición: borra todos los boards creados por este archivo
  registerTrackerCleanup(tracker);

  // La cuenta de pruebas puede no tener permiso para boards privados (403): ver CAP_PRIVATE_BOARDS
  const itPrivate = config.capabilities.privateBoards ? it : it.skip;

  it('TC-BOARDS-001: create a public board with a valid name', async () => {
    const name = testName('TC001 public board');
    const result = await boards.create({ name, kind: 'public' });
    const { status, headers, body, ms } = result;
    const id = tracker.track(result);

    expect(status).toBe(200);
    expect(headers['content-type']).toContain('application/json');
    expect(body.errors).toBeUndefined();
    const board = body.data?.create_board;
    expect(validateBoard(board)).toBe(true);
    expect(boardErrors()).toBe('No errors');
    expect(board.name).toBe(name);
    expect(board.board_kind).toBe('public');
    expect(board.state).toBe('active');
    warnIfSlow('TC-BOARDS-001', ms);

    // Integridad: el board guardado coincide con lo enviado
    const check = await boards.getByIdAnyState(id as string);
    expect(check.body.data?.boards[0].name).toBe(name);
  });

  itPrivate('TC-BOARDS-002: create a private board', async () => {
    const name = testName('TC002 private board');
    const result = await boards.create({ name, kind: 'private' });
    tracker.track(result);

    expect(result.status).toBe(200);
    expect(result.body.errors).toBeUndefined();
    expect(validateBoard(result.body.data?.create_board)).toBe(true);
    expect(result.body.data?.create_board.board_kind).toBe('private');
    expect(result.body.data?.create_board.name).toBe(name);
  });

  it('TC-BOARDS-003: create a board with a description', async () => {
    const name = testName('TC003 board with description');
    const description = 'AT - automated description';
    const result = await boards.create({ name, kind: 'public', description });
    tracker.track(result);

    expect(result.status).toBe(200);
    expect(result.body.errors).toBeUndefined();
    expect(result.body.data?.create_board.description).toBe(description);
  });

  it('TC-BOARDS-008: create a board with an empty name is rejected', async () => {
    const result = await boards.create({ name: '', kind: 'public' });
    tracker.track(result);

    // GraphQL responde 200 aunque la operación falle: se verifica el arreglo errors
    expect(result.status).toBe(200);
    expect(result.body.errors?.[0].extensions?.code).toBe('CreateBoardException');
    expect(result.body.data?.create_board).toBeNull();
  });

  it('TC-BOARDS-009: create a board with a very long name (>255 chars) is rejected', async () => {
    const result = await boards.create({ name: `AT - ${'A'.repeat(300)}`, kind: 'public' });
    tracker.track(result);

    expect(result.status).toBe(200);
    expect(result.body.errors?.[0].extensions?.code).toBe('CreateBoardException');
    expect(result.body.data?.create_board).toBeNull();
  });

  it('TC-BOARDS-013: create a board with an invalid board_kind is rejected', async () => {
    // El valor va escrito dentro de la query (como en Postman) para obtener el error del enum
    const result = await boards.raw(
      'mutation { create_board(board_name: "AT - TC013 invalid kind", board_kind: secret) { id } }',
      'create_board(invalid kind)'
    );
    tracker.track(result);

    expect(result.body.errors).toBeDefined();
    expect(result.body.errors?.[0].message).toContain('BoardKind');
    expect(result.body.data).toBeUndefined();
  });

  // Comportamiento observado en el Lab 2: la API permite nombres duplicados (hallazgo H-02).
  // Si el equipo decide que debe rechazarlos, cambiar las aserciones.
  it('TC-BOARDS-014: create two boards with the same name', async () => {
    const name = testName('TC014 duplicate');
    const first = await boards.create({ name, kind: 'public' });
    const firstId = tracker.track(first);
    const second = await boards.create({ name, kind: 'public' });
    const secondId = tracker.track(second);

    expect(first.body.errors).toBeUndefined();
    expect(second.body.errors).toBeUndefined();
    expect(secondId).not.toBe(firstId);
    expect(second.body.data?.create_board.name).toBe(name);
  });
});
