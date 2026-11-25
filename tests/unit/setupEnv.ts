import os from 'os';
import path from 'path';

// Las pruebas unitarias escriben sus logs en una carpeta temporal para no mezclarlos con los de la API.
process.env.LOG_DIR = path.join(os.tmpdir(), 'monday-unit-logs');
process.env.LOG_CONSOLE_LEVEL = 'error';
