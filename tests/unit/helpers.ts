import fs from 'fs';
import os from 'os';
import path from 'path';

/** Guarda y restaura variables de entorno para que las pruebas unitarias no se contaminen entre sí. */
export function withEnv(overrides: Record<string, string | undefined>): () => void {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

export const tempDir = (prefix: string): string => fs.mkdtempSync(path.join(os.tmpdir(), prefix));
