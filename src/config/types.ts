/** Banderas que describen lo que la cuenta usada para las pruebas tiene permitido hacer. */
export interface Capabilities {
  privateBoards: boolean;
  updateBoard: boolean;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/** Contenido de un archivo config/environments/<ambiente>.json */
export interface EnvironmentFile {
  name: string;
  description?: string;
  baseUrl: string;
  apiVersion: string;
  timeoutMs: number;
  delayMs: number;
  responseTimeLimitMs: number;
  logLevel: LogLevel;
  capabilities: Capabilities;
}
