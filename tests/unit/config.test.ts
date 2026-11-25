import { config, loadEnvironmentFile } from '../../src/config';
import { withEnv } from './helpers';

describe('Configuración por ambientes', () => {
  it('por defecto usa el ambiente qa (API real)', () => {
    const restore = withEnv({ TEST_ENV: undefined, BASE_URL: undefined, DELAY_MS: undefined });
    expect(config.envName).toBe('qa');
    expect(config.baseUrl).toBe('https://api.monday.com/v2');
    expect(config.delayMs).toBe(4000);
    restore();
  });

  it('TEST_ENV=mock cambia la URL y quita la espera', () => {
    const restore = withEnv({ TEST_ENV: 'mock', BASE_URL: undefined, DELAY_MS: undefined });
    expect(config.baseUrl).toBe('http://localhost:4000');
    expect(config.delayMs).toBe(0);
    restore();
  });

  it('las variables de entorno tienen prioridad sobre el archivo del ambiente', () => {
    const restore = withEnv({ TEST_ENV: 'qa', BASE_URL: 'http://otra-url', DELAY_MS: '123' });
    expect(config.baseUrl).toBe('http://otra-url');
    expect(config.delayMs).toBe(123);
    restore();
  });

  it('un valor numérico inválido vuelve al valor del archivo', () => {
    const restore = withEnv({ TEST_ENV: 'qa', DELAY_MS: 'abc' });
    expect(config.delayMs).toBe(4000);
    restore();
  });

  it('un ambiente inexistente falla y lista los disponibles', () => {
    expect(() => loadEnvironmentFile('produccion')).toThrow(/Ambientes disponibles: .*qa/);
  });

  it('las capacidades de la cuenta se pueden desactivar con CAP_*', () => {
    const restore = withEnv({
      TEST_ENV: 'qa',
      CAP_PRIVATE_BOARDS: 'false',
      CAP_UPDATE_BOARD: undefined
    });
    expect(config.capabilities).toEqual({ privateBoards: false, updateBoard: true });
    restore();
  });
});
