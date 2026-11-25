import { GqlResult } from '../core/types';
import { Logger } from '../logger/Logger';
import { BoardService } from '../services/BoardService';

/**
 * Postcondición reutilizable: registra los boards creados durante las pruebas y los borra al terminar,
 * de modo que la cuenta quede limpia aunque una prueba falle a la mitad.
 */
export class BoardTracker {
  private ids: string[] = [];
  private readonly log = Logger.for('BoardTracker');

  constructor(private readonly boards: BoardService = new BoardService()) {}

  /** Guarda el id si la respuesta de create_board lo trae y lo devuelve. */
  track(result: GqlResult): string | undefined {
    const id = BoardService.idFrom(result);
    if (id) {
      this.ids.push(id);
      this.log.debug('board registrado para limpieza', { id });
    }
    return id;
  }

  get pending(): number {
    return this.ids.length;
  }

  async cleanup(): Promise<void> {
    for (const id of this.ids) {
      const { body } = await this.boards.delete(id);
      if (body.errors) {
        this.log.warn('no se pudo borrar un board en la limpieza', { id, errors: body.errors });
      } else {
        this.log.info('board borrado en la limpieza', { id });
      }
    }
    this.ids = [];
  }
}
