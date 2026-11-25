// Valida todos los datasets de data/datasets contra el esquema.   Uso: npm run datasets:validate
import { listDatasets, loadBoardCases } from '../src/data/datasetLoader';

let failed = false;
for (const file of listDatasets()) {
  try {
    const cases = loadBoardCases(file);
    process.stdout.write(`OK   ${file} (${cases.length} casos)\n`);
  } catch (error) {
    failed = true;
    process.stderr.write(`FAIL ${file}\n${(error as Error).message}\n`);
  }
}
process.exit(failed ? 1 : 0);
