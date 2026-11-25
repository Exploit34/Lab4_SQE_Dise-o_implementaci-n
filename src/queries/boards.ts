// Capa de datos: queries y mutations de la feature Boards.
// Se usan variables ($name, $kind...) y no texto concatenado.
// Verifica nombres y argumentos en la documentación de monday.com para la API-Version que uses.

export const ME = `query { me { id name email } }`;

export const CREATE_BOARD = `mutation ($name: String!, $kind: BoardKind!, $description: String) {
  create_board(board_name: $name, board_kind: $kind, description: $description) {
    id name board_kind state description
  }
}`;

export const GET_BOARDS = `query ($ids: [ID!]) {
  boards(ids: $ids) { id name board_kind state }
}`;

// state: all incluye boards archivados (por defecto solo devuelve los activos)
export const GET_BOARDS_ANY_STATE = `query ($ids: [ID!]) {
  boards(ids: $ids, state: all) { id name board_kind state }
}`;

export const LIST_BOARDS = `query ($limit: Int) {
  boards(limit: $limit) { id name }
}`;

export const UPDATE_BOARD_NAME = `mutation ($id: ID!, $value: String!) {
  update_board(board_id: $id, board_attribute: name, new_value: $value)
}`;

export const ARCHIVE_BOARD = `mutation ($id: ID!) {
  archive_board(board_id: $id) { id state }
}`;

export const DELETE_BOARD = `mutation ($id: ID!) {
  delete_board(board_id: $id) { id }
}`;
