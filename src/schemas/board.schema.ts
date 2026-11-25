// Esquema JSON de un board. Verifica estructura y tipos de los campos devueltos.
export const boardSchema = {
  type: 'object',
  required: ['id', 'name', 'board_kind', 'state'],
  properties: {
    id: { type: 'string', pattern: '^[0-9]+$' },
    name: { type: 'string', minLength: 1 },
    board_kind: { enum: ['public', 'private', 'share'] },
    state: { enum: ['active', 'archived', 'deleted'] },
    description: { type: ['string', 'null'] }
  },
  additionalProperties: true
};
