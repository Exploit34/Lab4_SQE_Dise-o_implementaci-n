import { config } from '../../src/config';
import { TestContext } from '../../src/context/TestContext';
import { validateBoard } from '../../src/schemas/validate';
import { BoardService } from '../../src/services/BoardService';
import { testName } from '../../src/utils/names';
import { warnIfSlow } from '../../src/utils/performance';
import { registerBoardPrecondition } from '../support/fixtures';

describe('Boards: update and archive (with precondition)', () => {
  const boards = new BoardService();
  const ctx = new TestContext();

  // Precondición: un board nuevo para cada prueba. Postcondición: se borra al terminar.
  registerBoardPrecondition(ctx, boards, { label: 'precondition board' });

  // La cuenta de pruebas puede recibir 403 en update_board: ver CAP_UPDATE_BOARD
  const itUpdate = config.capabilities.updateBoard ? it : it.skip;

  itUpdate('TC-BOARDS-006: rename an existing board', async () => {
    const boardId = ctx.require('boardId');
    const newName = testName('TC006 renamed board');
    const { status, headers, body, ms } = await boards.rename(boardId, newName);

    expect(status).toBe(200);
    expect(headers['content-type']).toContain('application/json');
    expect(body.errors).toBeUndefined();
    // update_board devuelve un texto JSON con { success: true, ... }
    expect(JSON.parse(body.data?.update_board).success).toBe(true);
    warnIfSlow('TC-BOARDS-006', ms);

    // Integridad: se vuelve a leer el board y se compara el nombre
    const check = await boards.getByIdAnyState(boardId);
    const board = check.body.data?.boards[0];
    expect(validateBoard(board)).toBe(true);
    expect(board.name).toBe(newName);
  });

  it('TC-BOARDS-007: archive a board', async () => {
    const boardId = ctx.require('boardId');
    const { status, body } = await boards.archive(boardId);

    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(body.data?.archive_board.state).toBe('archived');

    const check = await boards.getByIdAnyState(boardId);
    expect(check.body.data?.boards[0].state).toBe('archived');
  });
});
