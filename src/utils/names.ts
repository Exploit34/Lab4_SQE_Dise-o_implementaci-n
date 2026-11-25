/** Nombre único para datos automatizados: siempre empieza con "AT - ". */
export const testName = (label: string): string => `AT - ${label} ${Date.now()}`;
