import { config } from '../../src/config';
import { TestContext } from '../../src/context/TestContext';
import { validateBoard } from '../../src/schemas/validate';
import { BoardService } from '../../src/services/BoardService';
import { testName } from '../../src/utils/names';

// Flujo completo. El id del board viaja entre pasos por el contexto (TestContext).
// Los pasos dependen del orden a propósito.
describe('Boards: E2E create, read, update, archive and delete', () => {
  const boards = new BoardService();
  const ctx = new TestContext();

  const itUpdate = config.capabilities.updateBoard ? it : it.skip;

  beforeAll(() => {
    ctx.set('boardName', testName('E2E board'));
    ctx.set('renamedName', testName('E2E renamed board'));
  });

  // Postcondición: si un paso falla antes de borrar, se limpia igualmente
  afterAll(async () => {
    if (ctx.has('boardId')) await boards.delete(ctx.require('boardId'));
  });

  it('step 1: create the board and save its id', async () => {
    const { status, body } = await boards.create({
      name: ctx.require('boardName'),
      kind: 'public'
    });
    expect(status).toBe(200);
    expect(body.errors).toBeUndefined();
    ctx.set('boardId', body.data?.create_board.id);
    expect(ctx.require('boardId')).toEqual(expect.any(String));
  });

  it('step 2: read the board', async () => {
    const { body } = await boards.getById(ctx.require('boardId'));
    expect(body.errors).toBeUndefined();
    expect(validateBoard(body.data?.boards[0])).toBe(true);
    expect(body.data?.boards[0].name).toBe(ctx.require('boardName'));
  });

  itUpdate('step 3: rename the board', async () => {
    const id = ctx.require('boardId');
    const { body } = await boards.rename(id, ctx.require('renamedName'));
    expect(body.errors).toBeUndefined();
    const check = await boards.getById(id);
    expect(check.body.data?.boards[0].name).toBe(ctx.require('renamedName'));
  });

  it('step 4: archive the board', async () => {
    const id = ctx.require('boardId');
    const { body } = await boards.archive(id);
    expect(body.errors).toBeUndefined();
    const check = await boards.getByIdAnyState(id);
    expect(check.body.data?.boards[0].state).toBe('archived');
  });

  it('step 5: delete the board and confirm it is no longer active', async () => {
    const id = ctx.require('boardId');
    const { body } = await boards.delete(id);
    expect(body.errors).toBeUndefined();
    const check = await boards.getById(id);
    expect(check.body.data?.boards).toEqual([]);
    ctx.delete('boardId'); // ya está borrado, no hace falta limpiar
  });
});
