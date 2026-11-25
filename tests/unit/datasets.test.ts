import {
  listDatasets,
  loadBoardCases,
  parseCsv,
  resolvePlaceholders,
  validateCases
} from '../../src/data/datasetLoader';

describe('Datasets (generados con GenAI)', () => {
  it('resolvePlaceholders: {{ts}}, {{rand}} y {{repeat}}', () => {
    expect(resolvePlaceholders('a-{{ts}}')).toMatch(/^a-\d{13}$/);
    expect(resolvePlaceholders('{{rand}}')).toMatch(/^[0-9a-f]{6}$/);
    expect(resolvePlaceholders('{{repeat:ab:3}}')).toBe('ababab');
    expect(resolvePlaceholders('{{ts}}')).not.toBe('{{ts}}');
  });

  it('parseCsv maneja comillas, comas internas y comillas escapadas', () => {
    const rows = parseCsv('a,b\n"x, y","di ""hola"""\n1,2\n');
    expect(rows).toEqual([
      { a: 'x, y', b: 'di "hola"' },
      { a: '1', b: '2' }
    ]);
  });

  it('todos los datasets entregados cumplen el esquema y tienen ids únicos entre archivos', () => {
    const ids = listDatasets().flatMap((file) => loadBoardCases(file).map((c) => c.id));
    expect(ids.length).toBeGreaterThanOrEqual(25);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los datasets cubren las categorías de riesgo esperadas', () => {
    const tags = new Set(listDatasets().flatMap((f) => loadBoardCases(f).flatMap((c) => c.tags)));
    for (const tag of ['unicode', 'boundary', 'security', 'whitespace', 'negative', 'enum']) {
      expect(tags.has(tag)).toBe(true);
    }
  });

  it('los casos de límite generan exactamente 255, 256 y 1000 caracteres', () => {
    const byId = Object.fromEntries(
      loadBoardCases('boards.create.names.json').map((c) => [c.id, c])
    );
    expect(byId['DS-NAME-011'].name).toHaveLength(255);
    expect(byId['DS-NAME-012'].name).toHaveLength(256);
    expect(byId['DS-NAME-013'].name).toHaveLength(1000);
  });

  it('dos cargas del mismo dataset producen nombres distintos (datos dinámicos)', async () => {
    const first = loadBoardCases('boards.create.names.json')[0].name;
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = loadBoardCases('boards.create.names.json')[0].name;
    expect(second).not.toBe(first);
  });

  it('un dataset inválido se rechaza con un mensaje que lista los problemas', () => {
    const bad = [
      {
        id: 'X-1',
        title: 'id mal formado',
        name: 'n',
        kind: 'public',
        expected: 'success',
        tags: []
      },
      {
        id: 'DS-A-001',
        title: 'expected inválido',
        name: 'n',
        kind: 'public',
        expected: 'quizas',
        tags: []
      }
    ];
    expect(() => validateCases(bad, 'prueba')).toThrow(/Dataset inválido \(prueba\)/);
  });

  it('detecta ids duplicados', () => {
    const c = {
      id: 'DS-A-001',
      title: 'caso repetido',
      name: 'n',
      kind: 'public',
      expected: 'success',
      tags: []
    };
    expect(() => validateCases([c, c], 'dup')).toThrow(/id duplicado: DS-A-001/);
  });
});
