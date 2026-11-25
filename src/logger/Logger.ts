import fs from 'fs';
import path from 'path';
import winston from 'winston';
import Transport from 'winston-transport';
import { config } from '../config';

/**
 * Capa transversal de logging (basada en winston).
 *
 * Convenciones del equipo (ver docs/03-logging.md):
 *  - Cada clase o módulo obtiene su logger con Logger.for('NombreDelComponente').
 *  - Niveles: error (fallo real), warn (algo anómalo que no rompe), info (hitos), debug (detalle).
 *  - Cada línea lleva: timestamp | nivel | componente | testId | mensaje.
 *  - Los datos adicionales se pasan como objeto "meta"; las claves sensibles se enmascaran.
 *  - Nunca se escribe un token: ni en el mensaje ni en meta.
 */
export type Meta = Record<string, unknown>;

const SENSITIVE_KEYS = ['token', 'authorization', 'password', 'secret', 'apikey'];
const REDACTED = '[REDACTED]';

/** Enmascara recursivamente las claves sensibles de un objeto. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Meta).map(([key, val]) => [
        key,
        SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s)) ? REDACTED : redact(val)
      ])
    );
  }
  return value;
}

/** Transporte propio: escribe de forma síncrona para no perder líneas al cerrar Jest. */
class SyncFileTransport extends Transport {
  constructor(
    private readonly file: string,
    private readonly render: (info: winston.Logform.TransformableInfo) => string,
    opts: Transport.TransportStreamOptions
  ) {
    super(opts);
  }

  log(info: winston.Logform.TransformableInfo, next: () => void): void {
    fs.appendFileSync(this.file, `${this.render(info)}\n`, 'utf8');
    next();
  }
}

export const LOG_FILES = { text: 'execution.log', json: 'execution.jsonl' } as const;

let winstonLogger: winston.Logger | undefined;
let currentTestId = '-';

function textLine(info: winston.Logform.TransformableInfo): string {
  const { timestamp, level, component, testId, message, ...meta } = info as Meta & {
    level: string;
    message: string;
  };
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} | ${level.toUpperCase().padEnd(5)} | ${component ?? 'APP'} | ${testId ?? '-'} | ${message}${extra}`;
}

function jsonLine(info: winston.Logform.TransformableInfo): string {
  return JSON.stringify(info);
}

function build(): winston.Logger {
  const dir = config.logDir;
  fs.mkdirSync(dir, { recursive: true });
  // Se modifica el objeto en sitio: winston guarda el nivel en claves tipo Symbol que no se deben perder.
  const sanitize = winston.format((info) => {
    for (const key of Object.keys(info)) {
      if (['level', 'message', 'timestamp'].includes(key)) continue;
      info[key] = SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))
        ? REDACTED
        : redact(info[key]);
    }
    return info;
  });

  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.timestamp(), sanitize()),
    transports: [
      new winston.transports.Console({
        level: config.logConsoleLevel,
        format: winston.format.printf(textLine)
      }),
      new SyncFileTransport(path.join(dir, LOG_FILES.text), textLine, { level: config.logLevel }),
      new SyncFileTransport(path.join(dir, LOG_FILES.json), jsonLine, { level: config.logLevel })
    ]
  });
}

export class Logger {
  private constructor(private readonly component: string) {}

  /** Punto de entrada: un logger por componente (clase o módulo). */
  static for(component: string): Logger {
    return new Logger(component);
  }

  /** Identifica la prueba en ejecución; los hooks globales lo actualizan en cada test. */
  static setTestScope(testId: string | undefined): void {
    currentTestId = testId || '-';
  }

  static get testScope(): string {
    return currentTestId;
  }

  /** Cierra el logger (útil en pruebas unitarias que cambian LOG_DIR). */
  static reset(): void {
    winstonLogger?.close();
    winstonLogger = undefined;
    currentTestId = '-';
  }

  error(message: string, meta: Meta = {}): void {
    this.write('error', message, meta);
  }
  warn(message: string, meta: Meta = {}): void {
    this.write('warn', message, meta);
  }
  info(message: string, meta: Meta = {}): void {
    this.write('info', message, meta);
  }
  debug(message: string, meta: Meta = {}): void {
    this.write('debug', message, meta);
  }

  private write(level: 'error' | 'warn' | 'info' | 'debug', message: string, meta: Meta): void {
    winstonLogger ??= build();
    winstonLogger.log({
      level,
      message,
      component: this.component,
      testId: currentTestId,
      ...meta
    });
  }
}

/**
 * Extrae el identificador corto de una prueba: "TC-BOARDS-001", "AUTH-001", "DS-NAME-003"
 * o "E2E step 3". Si no encuentra patrón devuelve el nombre completo recortado.
 */
export function testIdFromName(fullName: string | undefined): string {
  if (!fullName) return '-';
  const match = fullName.match(/\b(TC-[A-Z]+-\d+|AUTH-\d+|DS-[A-Z]+-\d+)\b/);
  if (match) return match[1];
  const step = fullName.match(/E2E.*?(step \d+)/i);
  if (step) return `E2E ${step[1]}`;
  return fullName.length > 60 ? `${fullName.slice(0, 57)}...` : fullName;
}
