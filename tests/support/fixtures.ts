import { TestContext } from '../../src/context/TestContext';
import { Logger } from '../../src/logger/Logger';
import { BoardService, BoardKind } from '../../src/services/BoardService';
import { testName } from '../../src/utils/names';
import { BoardTracker } from '../../src/helpers/BoardTracker';

const log = Logger.for('Fixtures');

export interface BoardPreconditionOptions {
  /** Etiqueta usada para construir el nombre del board de la precondición. */
  label: string;
  kind?: BoardKind;
}

/**
 * PRECONDICIÓN + POSTCONDICIÓN reutilizable.
 *  - beforeEach: crea un board por API y deja boardId, boardName y boardKind en el contexto.
 *    Si la creación falla, lanza un error que explica que falló la PRECONDICIÓN (no la prueba).
 *  - afterEach: borra el board (postcondición) y limpia el contexto.
 */
export function registerBoardPrecondition(
  ctx: TestContext,
  boards: BoardService,
  { label, kind = 'public' }: BoardPreconditionOptions
): void {
  beforeEach(async () => {
    const name = testName(label);
    const result = await boards.create({ name, kind });
    const id = BoardService.idFrom(result);
    if (!id) {
      throw new Error(
        `Falló la PRECONDICIÓN (crear board). HTTP ${result.status}: ${JSON.stringify(result.body.errors)}`
      );
    }
    ctx.set('boardId', id);
    ctx.set('boardName', name);
    ctx.set('boardKind', kind);
    log.info('precondición lista: board creado', { id });
  });

  afterEach(async () => {
    const id = ctx.get('boardId');
    if (id) {
      const { body } = await boards.delete(id);
      if (body.errors)
        log.warn('postcondición: no se pudo borrar el board', { id, errors: body.errors });
      else log.info('postcondición cumplida: board borrado', { id });
    }
    ctx.clear();
  });
}

/** POSTCONDICIÓN de archivo: al terminar todas las pruebas se borra todo lo que quedó registrado. */
export function registerTrackerCleanup(tracker: BoardTracker): void {
  afterAll(async () => {
    await tracker.cleanup();
  });
}
