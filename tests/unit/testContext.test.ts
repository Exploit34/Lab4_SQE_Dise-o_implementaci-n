import { TestContext } from '../../src/context/TestContext';

describe('TestContext (variables de contexto)', () => {
  it('guarda y lee variables tipadas', () => {
    const ctx = new TestContext();
    ctx.set('boardId', '123');
    expect(ctx.get('boardId')).toBe('123');
    expect(ctx.has('boardId')).toBe(true);
    expect(ctx.snapshot()).toEqual({ boardId: '123' });
  });

  it('require() lanza un error claro si la variable no existe', () => {
    expect(() => new TestContext().require('boardId')).toThrow(/"boardId" no está definida/);
  });

  it('delete() y clear() eliminan variables', () => {
    const ctx = new TestContext();
    ctx.set('boardId', '1');
    ctx.set('boardName', 'n');
    ctx.delete('boardId');
    expect(ctx.has('boardId')).toBe(false);
    ctx.clear();
    expect(ctx.snapshot()).toEqual({});
  });

  it('dos contextos no comparten datos (aislamiento entre suites)', () => {
    const a = new TestContext();
    const b = new TestContext();
    a.set('boardId', '1');
    expect(b.get('boardId')).toBeUndefined();
  });
});
