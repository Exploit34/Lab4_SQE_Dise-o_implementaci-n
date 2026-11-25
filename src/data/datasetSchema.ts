// Esquema Ajv que todo dataset (JSON o CSV) debe cumplir antes de usarse en una prueba.
// Es la "puerta de calidad" para datos generados con IA: si el dataset no cumple, no se ejecuta.
export const boardCaseSchema = {
  type: 'object',
  required: ['id', 'title', 'name', 'kind', 'expected', 'tags'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^DS-[A-Z]+-[0-9]{3}$' },
    title: { type: 'string', minLength: 5 },
    name: { type: 'string' },
    kind: { type: 'string' },
    description: { type: 'string' },
    expected: { enum: ['success', 'rejected', 'either'] },
    errorCode: { type: 'string' },
    requires: { enum: ['privateBoards'] },
    tags: { type: 'array', items: { type: 'string' } }
  }
} as const;
