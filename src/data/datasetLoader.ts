import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { randomBytes } from 'crypto';
import { Logger } from '../logger/Logger';
import { boardCaseSchema } from './datasetSchema';
import { BoardCreateCase } from './types';

const log = Logger.for('DatasetLoader');
const ajv = new Ajv({ allErrors: true });
const validateCase = ajv.compile(boardCaseSchema);

export const DATASET_DIR = path.resolve(__dirname, '../../data/datasets');

/**
 * Resuelve placeholders para que un mismo dataset genere datos distintos en cada corrida:
 *   {{ts}}            marca de tiempo en milisegundos
 *   {{rand}}          6 caracteres hexadecimales aleatorios
 *   {{repeat:X:N}}    el texto X repetido N veces (para probar límites de longitud)
 */
export function resolvePlaceholders(text: string): string {
  return text
    .replace(/\{\{ts\}\}/g, () => String(Date.now()))
    .replace(/\{\{rand\}\}/g, () => randomBytes(3).toString('hex'))
    .replace(/\{\{repeat:([^:}]+):(\d+)\}\}/g, (_m, chunk: string, times: string) =>
      chunk.repeat(Number(times))
    );
}

/** Lector CSV mínimo: separador coma, comillas dobles, "" como comilla escapada, saltos de línea entre comillas. */
export function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (quoted) {
      if (ch === '"' && content[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c !== '')) rows.push(row);

  const [header, ...body] = rows;
  return body.map((cells) => Object.fromEntries(header.map((h, i) => [h.trim(), cells[i] ?? ''])));
}

function normalizeCsvRow(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'tags') out.tags = value ? value.split('|').map((t) => t.trim()) : [];
    else if (value !== '') out[key] = value;
  }
  if (!out.tags) out.tags = [];
  return out;
}

/** Valida todos los casos y lanza un error que lista cada problema (con el id del caso). */
export function validateCases(items: unknown[], source: string): BoardCreateCase[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    if (!validateCase(item)) {
      problems.push(`caso #${index + 1}: ${ajv.errorsText(validateCase.errors)}`);
      return;
    }
    const c = item as BoardCreateCase;
    if (seen.has(c.id)) problems.push(`id duplicado: ${c.id}`);
    seen.add(c.id);
    if (c.expected === 'rejected' && c.requires) {
      problems.push(`${c.id}: un caso "rejected" no debería depender de capacidades`);
    }
  });

  if (problems.length) {
    throw new Error(`Dataset inválido (${source}):\n - ${problems.join('\n - ')}`);
  }
  return items as BoardCreateCase[];
}

/** Carga un dataset (.json o .csv) desde data/datasets, lo valida y resuelve los placeholders. */
export function loadBoardCases(fileName: string): BoardCreateCase[] {
  const file = path.join(DATASET_DIR, fileName);
  const content = fs.readFileSync(file, 'utf8');
  const raw: unknown[] = fileName.endsWith('.csv')
    ? parseCsv(content).map(normalizeCsvRow)
    : (JSON.parse(content) as unknown[]);

  const cases = validateCases(raw, fileName).map((c) => ({
    ...c,
    name: resolvePlaceholders(c.name),
    description: c.description === undefined ? undefined : resolvePlaceholders(c.description)
  }));
  log.info('dataset cargado', { fileName, cases: cases.length });
  return cases;
}

/** Lista los datasets disponibles (usado por `npm run datasets:validate`). */
export function listDatasets(): string[] {
  return fs.readdirSync(DATASET_DIR).filter((f) => /\.(json|csv)$/.test(f));
}
