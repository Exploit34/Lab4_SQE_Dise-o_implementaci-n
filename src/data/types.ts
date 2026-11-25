export type Expectation = 'success' | 'rejected' | 'either';

/** Un caso de prueba de un dataset de creación de boards. */
export interface BoardCreateCase {
  /** Identificador único, por ejemplo DS-NAME-003. */
  id: string;
  title: string;
  /** Puede contener placeholders ({{ts}}, {{repeat:A:250}}...) que se resuelven al cargar. */
  name: string;
  /** Puede ser un valor inválido a propósito (DS-INVKIND-*). */
  kind: string;
  description?: string;
  /**
   * success  -> la API debe crear el board.
   * rejected -> la API debe rechazar la petición y no crear nada.
   * either   -> comportamiento no documentado: se registra lo observado y se exige una respuesta bien formada.
   */
  expected: Expectation;
  /** Código esperado en errors[0].extensions.code cuando expected = rejected (opcional). */
  errorCode?: string;
  /** Capacidad de la cuenta necesaria para ejecutar el caso (si no la tiene, se omite). */
  requires?: 'privateBoards';
  /** Etiquetas libres. "may-normalize": la API puede modificar el texto, no se exige igualdad exacta. */
  tags: string[];
}
