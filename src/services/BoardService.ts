import { RequestManager } from '../core/RequestManager';
import { AuthRole, GqlResult } from '../core/types';
import {
  ARCHIVE_BOARD,
  CREATE_BOARD,
  DELETE_BOARD,
  GET_BOARDS,
  GET_BOARDS_ANY_STATE,
  LIST_BOARDS,
  ME,
  UPDATE_BOARD_NAME
} from '../queries/boards';

export type BoardKind = 'public' | 'private' | 'share';

export interface CreateBoardInput {
  name: string;
  /** Se acepta string para poder probar valores inválidos del enum BoardKind. */
  kind: BoardKind | string;
  description?: string;
}

/**
 * Capa de servicios (lógica de negocio de la API): una operación por método.
 * Las pruebas llaman a este servicio y nunca arman peticiones HTTP ni queries por su cuenta.
 * Todas las peticiones salen por el Singleton RequestManager.
 */
export class BoardService {
  private get http(): RequestManager {
    return RequestManager.getInstance();
  }

  me(auth: AuthRole = 'valid'): Promise<GqlResult> {
    return this.http.send(ME, {}, { auth, operation: 'me' });
  }

  create(input: CreateBoardInput, auth: AuthRole = 'valid'): Promise<GqlResult> {
    return this.http.send(CREATE_BOARD, { ...input }, { auth, operation: 'create_board' });
  }

  /** Consulta con texto libre: solo para casos que necesitan escribir el valor dentro de la query. */
  raw(query: string, operation = 'raw_query', auth: AuthRole = 'valid'): Promise<GqlResult> {
    return this.http.send(query, {}, { auth, operation });
  }

  getById(id: string, auth: AuthRole = 'valid'): Promise<GqlResult> {
    return this.http.send(GET_BOARDS, { ids: [id] }, { auth, operation: 'boards' });
  }

  /** Igual que getById pero incluye boards archivados. */
  getByIdAnyState(id: string): Promise<GqlResult> {
    return this.http.send(GET_BOARDS_ANY_STATE, { ids: [id] }, { operation: 'boards(state:all)' });
  }

  list(limit: number): Promise<GqlResult> {
    return this.http.send(LIST_BOARDS, { limit }, { operation: 'boards(limit)' });
  }

  rename(id: string, name: string): Promise<GqlResult> {
    return this.http.send(UPDATE_BOARD_NAME, { id, value: name }, { operation: 'update_board' });
  }

  archive(id: string): Promise<GqlResult> {
    return this.http.send(ARCHIVE_BOARD, { id }, { operation: 'archive_board' });
  }

  delete(id: string): Promise<GqlResult> {
    return this.http.send(DELETE_BOARD, { id }, { operation: 'delete_board' });
  }

  /** Extrae el id de una respuesta de create_board (undefined si la creación falló). */
  static idFrom(result: GqlResult): string | undefined {
    return result.body?.data?.create_board?.id ?? undefined;
  }
}
