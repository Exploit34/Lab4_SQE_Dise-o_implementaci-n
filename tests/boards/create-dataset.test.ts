import { config } from '../../src/config';
import { GqlResult } from '../../src/core/types';
import { loadBoardCases } from '../../src/data/datasetLoader';
import { BoardCreateCase } from '../../src/data/types';
import { BoardTracker } from '../../src/helpers/BoardTracker';
import { Logger } from '../../src/logger/Logger';
import { boardErrors, validateBoard } from '../../src/schemas/validate';
import { BoardService } from '../../src/services/BoardService';
import { registerTrackerCleanup } from '../support/fixtures';

/**
 * Pruebas dirigidas por datos (data-driven). Los datasets de data/datasets/ fueron generados con IA
 * (ver docs/04-precondiciones-contexto-genai.md) y se validan con un esquema Ajv al cargarse.
 * Cada caso se ejecuta como una prueba independiente con su propio id (DS-...).
 */
const log = Logger.for('DatasetTest');

const isRunnable = (c: BoardCreateCase): boolean =>
  c.requires !== 'privateBoards' || config.capabilities.privateBoards;

const split = (cases: BoardCreateCase[]) => ({
  run: cases.filter(isRunnable),
  skip: cases.filter((c) => !isRunnable(c))
});

describe('Boards: create_board data-driven (datasets GenAI)', () => {
  const boards = new BoardService();
  const tracker = new BoardTracker(boards);
  registerTrackerCleanup(tracker);

  /** Aserciones según lo que declara el caso (success / rejected / either). */
  function verify(c: BoardCreateCase, result: GqlResult): void {
    const id = tracker.track(result);
    const { status, body } = result;
    const board = body.data?.create_board;
    const mayNormalize = c.tags.includes('may-normalize');

    if (c.expected === 'success') {
      expect(status).toBe(200);
      expect(body.errors).toBeUndefined();
      expect(validateBoard(board)).toBe(true);
      expect(boardErrors()).toBe('No errors');
      expect(board.state).toBe('active');
      expect(board.board_kind).toBe(c.kind);
      if (mayNormalize) {
        if (board.name !== c.name)
          log.info('la API normalizó el nombre', { sent: c.name, got: board.name });
      } else {
        expect(board.name).toBe(c.name);
        if (c.description !== undefined) expect(board.description).toBe(c.description);
      }
      return;
    }

    if (c.expected === 'rejected') {
      expect(status).toBeLessThan(500);
      expect(body.errors).toBeDefined();
      expect(id).toBeUndefined();
      if (c.errorCode) expect(body.errors?.[0].extensions?.code).toBe(c.errorCode);
      return;
    }

    // either: comportamiento no documentado. Se exige una respuesta bien formada y se registra lo observado.
    expect(status).toBeLessThan(500);
    if (body.errors) {
      expect(typeof body.errors[0].message).toBe('string');
      expect(id).toBeUndefined();
      log.info(`observado: la API RECHAZÓ ${c.id}`, {
        event: 'observation',
        code: body.errors[0].extensions?.code
      });
    } else {
      expect(validateBoard(board)).toBe(true);
      log.info(`observado: la API ACEPTÓ ${c.id}`, { event: 'observation', name: board.name });
    }
  }

  const datasets: Array<[string, string]> = [
    ['names (JSON)', 'boards.create.names.json'],
    ['kinds and descriptions (CSV)', 'boards.create.kinds-descriptions.csv'],
    ['invalid kinds (JSON)', 'boards.create.invalid-kinds.json']
  ];

  describe.each(datasets)('dataset: %s', (_label, file) => {
    const { run, skip } = split(loadBoardCases(file));

    if (run.length) {
      it.each(run)('$id: $title', async (c) => {
        const result = await boards.create({
          name: c.name,
          kind: c.kind,
          description: c.description
        });
        verify(c, result);
      });
    }

    // Casos que la cuenta no puede ejecutar (por ejemplo, boards privados sin permiso): quedan visibles como omitidos.
    if (skip.length) it.skip.each(skip)('$id: $title', () => undefined);
  });
});
