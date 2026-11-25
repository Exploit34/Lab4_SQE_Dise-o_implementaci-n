import { Logger } from '../logger/Logger';

/**
 * Variables que las pruebas comparten entre sí y con sus hooks.
 * Tener las claves tipadas evita errores de escritura ("boardID" vs "boardId") y deja claro
 * qué datos viajan por el contexto.
 */
export interface ContextVariables {
  boardId: string;
  boardName: string;
  renamedName: string;
  boardKind: string;
}

/**
 * Contexto de una suite de pruebas. Reemplaza a las variables sueltas (`let boardId`)
 * que antes se declaraban en cada archivo.
 *
 * Ciclo de vida: se crea una instancia por describe, los hooks (beforeEach/afterEach)
 * escriben en ella y las pruebas leen con require(), que falla con un mensaje claro si falta algo.
 */
export class TestContext {
  private readonly values = new Map<keyof ContextVariables, string>();
  private readonly log = Logger.for('TestContext');

  set<K extends keyof ContextVariables>(key: K, value: ContextVariables[K]): void {
    this.values.set(key, value);
    this.log.debug(`contexto: ${key} definido`, { key, value });
  }

  get<K extends keyof ContextVariables>(key: K): ContextVariables[K] | undefined {
    return this.values.get(key) as ContextVariables[K] | undefined;
  }

  /** Lee una variable obligatoria; si falta, el error indica qué paso previo no la dejó lista. */
  require<K extends keyof ContextVariables>(key: K): ContextVariables[K] {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(
        `La variable de contexto "${key}" no está definida. ¿Falló la precondición o un paso anterior?`
      );
    }
    return value;
  }

  has(key: keyof ContextVariables): boolean {
    return this.values.has(key);
  }

  delete(key: keyof ContextVariables): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }

  snapshot(): Partial<ContextVariables> {
    return Object.fromEntries(this.values) as Partial<ContextVariables>;
  }
}
