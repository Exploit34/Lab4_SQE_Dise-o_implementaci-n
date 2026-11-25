import fs from 'fs';
import path from 'path';
import { Capabilities, EnvironmentFile, LogLevel } from './types';

/**
 * Capa de configuración.
 * Prioridad (de mayor a menor):
 *   1. Variables de entorno del proceso o del archivo .env (secretos y ajustes puntuales)
 *   2. Archivo del ambiente: config/environments/<TEST_ENV>.json (valores no secretos)
 * El ambiente se elige con TEST_ENV (por defecto "qa").
 * Los valores se leen en cada acceso (getters) para que las pruebas puedan cambiarlos.
 */
const ENV_DIR = path.resolve(__dirname, '../../config/environments');
const LOG_LEVELS: LogLevel[] = ['error', 'warn', 'info', 'debug'];

export function loadEnvironmentFile(name: string): EnvironmentFile {
  const file = path.join(ENV_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    const available = fs
      .readdirSync(ENV_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
    throw new Error(`TEST_ENV="${name}" no existe. Ambientes disponibles: ${available.join(', ')}`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as EnvironmentFile;
}

const flag = (envName: string, fallback: boolean): boolean => {
  const raw = process.env[envName];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes'].includes(raw.toLowerCase());
};

const positiveNumber = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const level = (raw: string | undefined, fallback: LogLevel): LogLevel =>
  LOG_LEVELS.includes(raw as LogLevel) ? (raw as LogLevel) : fallback;

const environment = (): EnvironmentFile => loadEnvironmentFile(process.env.TEST_ENV || 'qa');

export const config = {
  get envName(): string {
    return environment().name;
  },
  get baseUrl(): string {
    return process.env.BASE_URL || environment().baseUrl;
  },
  get apiVersion(): string {
    return process.env.API_VERSION || environment().apiVersion;
  },
  get apiToken(): string | undefined {
    return process.env.API_TOKEN || undefined;
  },
  get invalidToken(): string {
    return process.env.INVALID_TOKEN || 'invalid_token_123';
  },
  get restrictedToken(): string | undefined {
    return process.env.RESTRICTED_TOKEN || undefined;
  },
  get timeoutMs(): number {
    return positiveNumber(process.env.TIMEOUT_MS, environment().timeoutMs);
  },
  /** Espera tras cada prueba para respetar el límite de complejidad por minuto de monday.com. */
  get delayMs(): number {
    return positiveNumber(process.env.DELAY_MS, environment().delayMs);
  },
  /** Límite de tiempo de respuesta: solo genera una advertencia, no hace fallar la prueba. */
  get responseTimeLimitMs(): number {
    return positiveNumber(process.env.RESPONSE_TIME_LIMIT_MS, environment().responseTimeLimitMs);
  },
  /** Nivel mínimo que se escribe en los archivos de log. */
  get logLevel(): LogLevel {
    return level(process.env.LOG_LEVEL, environment().logLevel);
  },
  /** Nivel mínimo que se muestra en la consola (por defecto solo advertencias y errores). */
  get logConsoleLevel(): LogLevel {
    return level(process.env.LOG_CONSOLE_LEVEL, 'warn');
  },
  get logDir(): string {
    return path.resolve(process.env.LOG_DIR || path.resolve(__dirname, '../../logs'));
  },
  get capabilities(): Capabilities {
    const base = environment().capabilities;
    return {
      privateBoards: flag('CAP_PRIVATE_BOARDS', base.privateBoards),
      updateBoard: flag('CAP_UPDATE_BOARD', base.updateBoard)
    };
  }
};
