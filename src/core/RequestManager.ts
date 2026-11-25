import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { Logger } from '../logger/Logger';
import { AuthRole, GqlResult, RequestStats, SendOptions } from './types';

export class RequestManager {
  private static instance: RequestManager | undefined;

  private readonly clients = new Map<AuthRole, AxiosInstance>();
  private readonly log = Logger.for('RequestManager');
  private stats: RequestStats = RequestManager.emptyStats();

  private constructor() {
    this.log.debug('RequestManager creado (única instancia)');
  }

  static getInstance(): RequestManager {
    RequestManager.instance ??= new RequestManager();
    return RequestManager.instance;
  }

  static resetInstance(): void {
    RequestManager.instance = undefined;
  }

  private static emptyStats(): RequestStats {
    return { total: 0, failedHttp: 0, graphqlErrors: 0, totalMs: 0, byOperation: {} };
  }

  private tokenFor(role: AuthRole): string | undefined {
    switch (role) {
      case 'valid':
        return config.apiToken;
      case 'invalid':
        return config.invalidToken;
      case 'restricted':
        if (!config.restrictedToken) {
          throw new Error('RESTRICTED_TOKEN no está definido en el entorno');
        }
        return config.restrictedToken;
    }
  }

  getClient(role: AuthRole = 'valid'): AxiosInstance {
    let client = this.clients.get(role);
    if (!client) {
      const token = this.tokenFor(role);
      client = axios.create({
        baseURL: config.baseUrl,
        timeout: config.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'API-Version': config.apiVersion,
          ...(token ? { Authorization: token } : {})
        },
        validateStatus: () => true
      });
      this.clients.set(role, client);
      this.log.debug('Cliente HTTP creado', { role, baseUrl: config.baseUrl });
    }
    return client;
  }

  async send(
    query: string,
    variables: Record<string, unknown> = {},
    options: SendOptions = {}
  ): Promise<GqlResult> {
    const { auth = 'valid', operation = 'graphql' } = options;
    const start = Date.now();
    this.log.debug(`-> ${operation}`, { auth, variables });

    const res = await this.getClient(auth).post('', { query, variables });
    const result: GqlResult = {
      status: res.status,
      headers: res.headers,
      body: res.data,
      ms: Date.now() - start
    };

    this.record(operation, result);
    return result;
  }

  private record(operation: string, result: GqlResult): void {
    this.stats.total += 1;
    this.stats.totalMs += result.ms;
    this.stats.byOperation[operation] = (this.stats.byOperation[operation] ?? 0) + 1;

    const hasErrors = Array.isArray(result.body?.errors) && result.body.errors.length > 0;
    if (result.status >= 400) this.stats.failedHttp += 1;
    if (hasErrors) this.stats.graphqlErrors += 1;

    // Convención: una respuesta con error es normal en una prueba negativa, por eso se registra
    // como info con el campo "outcome". Solo un 5xx (fallo del servidor) se registra como error.
    const outcome = result.status >= 400 ? 'http-error' : hasErrors ? 'graphql-error' : 'ok';
    const meta = {
      event: 'request',
      operation,
      status: result.status,
      ms: result.ms,
      outcome,
      graphqlErrors: hasErrors
        ? result.body.errors?.map((e) => e.extensions?.code ?? e.message)
        : []
    };
    const text = `<- ${operation} HTTP ${result.status} (${result.ms} ms)`;
    if (result.status >= 500) this.log.error(text, meta);
    else this.log.info(text, meta);
  }

  /** Estadísticas acumuladas desde que se creó la instancia (o desde el último reset). */
  getStats(): RequestStats {
    return { ...this.stats, byOperation: { ...this.stats.byOperation } };
  }

  resetStats(): void {
    this.stats = RequestManager.emptyStats();
  }
}
