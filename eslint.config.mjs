import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

// Linter del marco. Reglas pensadas para que el código sea consistente y no oculte errores:
//  - no-console: todo mensaje pasa por el Logger (excepto scripts y PoC, que son herramientas de consola)
//  - no-unused-vars, eqeqeq, prefer-const, no-var: errores típicos
//  - capas: las pruebas no importan Axios directamente (deben usar servicios)
//  - eslint-config-prettier: desactiva reglas de estilo que choquen con Prettier
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'reports/**',
      'logs/**',
      'mock/**',
      'coverage/**',
      'jest.config.js',
      'reporters/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      curly: ['error', 'multi-line']
    }
  },
  {
    // Capa de pruebas: solo habla con los servicios, nunca con el transporte HTTP.
    files: ['tests/boards/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message: 'Las pruebas deben usar un servicio (src/services), no Axios.'
            }
          ],
          patterns: [
            {
              group: ['**/core/RequestManager'],
              message: 'Las pruebas no usan el RequestManager directamente; usan src/services.'
            }
          ]
        }
      ]
    }
  },
  {
    // Las herramientas de consola sí pueden escribir en la consola.
    files: ['scripts/**/*.ts', 'poc/**/*.ts'],
    rules: { 'no-console': 'off' }
  },
  prettier
);
