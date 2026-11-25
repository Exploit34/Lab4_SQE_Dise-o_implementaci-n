import { TestContext } from '../../src/context/TestContext';
import { validateBoard } from '../../src/schemas/validate';
import { BoardService } from '../../src/services/BoardService';
import { registerBoardPrecondition } from '../support/fixtures';

describe('Boards: read (boards query)', () => {
  const boards = new BoardService();
  const ctx = new TestContext();

  // Precondición y postcondición: solo para TC-BOARDS-004 (crea y borra un board por prueba)
  describe('with an existing board', () => {
    registerBoardPrecondition(ctx, boards, { label: 'TC004 board to read' });

    it('TC-BOARDS-004: get a board by ID', async () => {
      const boardId = ctx.require('boardId');
      const { status, body } = await boards.getById(boardId);

      expect(status).toBe(200);
      expect(body.errors).toBeUndefined();
      expect(body.data?.boards).toHaveLength(1);
      expect(validateBoard(body.data?.boards[0])).toBe(true);
      expect(body.data?.boards[0].id).toBe(boardId);
      expect(body.data?.boards[0].name).toBe(ctx.require('boardName'));
    });
  });

  it('TC-BOARDS-005: list boards with a limit', async () => {
    const { status, body } = await boards.list(5);

    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(Array.isArray(body.data?.boards)).toBe(true);
    expect(body.data?.boards.length).toBeLessThanOrEqual(5);
  });

  it('TC-BOARDS-010: get a board with a non-existent ID', async () => {
    const { status, body } = await boards.getById('999999999');

    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    expect(body.data?.boards).toEqual([]);
  });
});
