// Servidor GraphQL falso SOLO para comprobar que el marco funciona (instalación, configuración,
// hooks y reportes) sin gastar el límite de monday.com. NO reemplaza la ejecución contra la API real.
// Uso:  npm run mock   (puerto 4000, token: mock-token)
const http = require('http');

const VALID_TOKEN = process.env.MOCK_TOKEN || 'mock-token';
const PORT = Number(process.env.MOCK_PORT || 4000);
const KINDS = ['public', 'private', 'share'];
const boards = new Map();
// MOCK_DENY simula las operaciones que la cuenta real rechaza con 403 (ej: MOCK_DENY=update_board,private_board)
const DENY = (process.env.MOCK_DENY || '').split(',').filter(Boolean);
const forbidden = (path) => ({
  errors: [
    {
      message: 'User unauthorized to perform action',
      extensions: { code: 'UserUnauthorizedException', status_code: 403 },
      path: [path]
    }
  ],
  data: null
});
let seq = 1800000000;

const send = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const createError = () => ({
  errors: [
    {
      message: 'Failed to create board',
      extensions: { code: 'CreateBoardException', status_code: 400 }
    }
  ],
  data: { create_board: null }
});

function handle(query, vars) {
  if (query.includes('create_board')) {
    let name = vars.name;
    let kind = vars.kind;
    const literalName = query.match(/board_name:\s*"([^"]*)"/);
    const literalKind = query.match(/board_kind:\s*(\w+)/);
    if (name === undefined && literalName) name = literalName[1];
    if (kind === undefined && literalKind && !literalKind[1].startsWith('$')) kind = literalKind[1];
    if (kind === 'private' && DENY.includes('private_board')) return forbidden('create_board');
    if (!KINDS.includes(kind)) {
      return { errors: [{ message: `Value '${kind}' does not exist in 'BoardKind' enum.` }] };
    }
    if (!name || name.length > 255) return createError();
    const board = {
      id: String(seq++),
      name,
      board_kind: kind,
      state: 'active',
      description: vars.description ?? null
    };
    boards.set(board.id, board);
    return { data: { create_board: board } };
  }
  if (query.includes('delete_board')) {
    const board = boards.get(String(vars.id));
    if (board) board.state = 'deleted';
    return { data: { delete_board: { id: String(vars.id) } } };
  }
  if (query.includes('update_board')) {
    if (DENY.includes('update_board')) return forbidden('update_board');
    const board = boards.get(String(vars.id));
    if (board) board.name = vars.value;
    return { data: { update_board: JSON.stringify({ success: true }) } };
  }
  if (query.includes('archive_board')) {
    const board = boards.get(String(vars.id));
    if (board) board.state = 'archived';
    return { data: { archive_board: { id: String(vars.id), state: board ? 'archived' : null } } };
  }
  if (query.includes('boards(')) {
    const all = /state:\s*all/.test(query);
    let list = [...boards.values()].filter((b) => all || b.state === 'active');
    if (Array.isArray(vars.ids)) list = list.filter((b) => vars.ids.map(String).includes(b.id));
    if (vars.limit) list = list.slice(0, vars.limit);
    return { data: { boards: list } };
  }
  if (query.includes('me')) {
    return { data: { me: { id: '1234567', name: 'Usuario Mock', email: 'mock@example.com' } } };
  }
  return { errors: [{ message: 'Operación no soportada por el mock' }] };
}

http
  .createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (req.headers.authorization !== VALID_TOKEN) {
        return send(res, 401, {
          errors: [{ message: 'Not authenticated', extensions: { code: 'NOT_AUTHENTICATED' } }]
        });
      }
      try {
        const { query = '', variables = {} } = JSON.parse(raw || '{}');
        send(res, 200, handle(query, variables));
      } catch {
        send(res, 400, { errors: [{ message: 'JSON inválido' }] });
      }
    });
  })
  .listen(PORT, () =>
    console.log(`Mock de monday.com en http://localhost:${PORT} (token: ${VALID_TOKEN})`)
  );
