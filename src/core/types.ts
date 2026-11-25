import { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';

export interface GqlError {
  message: string;
  extensions?: { code?: string; status_code?: number; [key: string]: unknown };
  path?: string[];
}

/** Cuerpo de una respuesta GraphQL. "data" es dinámico porque depende de cada query. */
export interface GqlBody {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- la forma de data depende de la query
  data?: Record<string, any> | null;
  errors?: GqlError[];
}

export interface GqlResult {
  status: number;
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
  body: GqlBody;
  ms: number;
}

/**
 * Qué credencial usa una petición:
 *  - valid: el token de la cuenta de pruebas (API_TOKEN)
 *  - invalid: un token falso (INVALID_TOKEN), para pruebas de autenticación
 *  - restricted: un token sin permisos de escritura (RESTRICTED_TOKEN)
 */
export type AuthRole = 'valid' | 'invalid' | 'restricted';

export interface SendOptions {
  auth?: AuthRole;
  /** Nombre corto de la operación, solo para los logs (por ejemplo "create_board"). */
  operation?: string;
}

export interface RequestStats {
  total: number;
  failedHttp: number;
  graphqlErrors: number;
  totalMs: number;
  byOperation: Record<string, number>;
}
