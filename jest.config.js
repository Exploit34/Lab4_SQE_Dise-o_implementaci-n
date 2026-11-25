/** @type {import('jest').Config} */
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node'
};

module.exports = {
  // Dos proyectos: "unit" (sin API, rápido) y "api" (contra monday.com o contra el mock)
  projects: [
    {
      ...base,
      displayName: 'unit',
      setupFiles: ['<rootDir>/tests/unit/setupEnv.ts'],
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts']
    },
    {
      ...base,
      displayName: 'api',
      // Carga el archivo .env antes de las pruebas
      setupFiles: ['dotenv/config'],
      // Hooks globales (verificación del token, etiquetado de logs y retraso entre pruebas)
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      testMatch: ['<rootDir>/tests/boards/**/*.test.ts']
    }
  ],
  // Cada prueba de API espera DELAY_MS en afterEach, por eso el timeout es amplio
  testTimeout: 60000,
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'reports', outputName: 'junit.xml' }],
    ['jest-html-reporters', { publicPath: 'reports', filename: 'report.html', openReport: false }],
    '<rootDir>/reporters/LogReporter.js'
  ]
};
