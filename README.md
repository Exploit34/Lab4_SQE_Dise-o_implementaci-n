# monday-api-automation

Marco de automatización de pruebas para la API GraphQL de monday.com (`https://api.monday.com/v2`), feature **Boards**.
Stack: **TypeScript · Jest · Axios · Ajv · Winston · ESLint · Prettier**.

## Documentación (léela en este orden)

| Actividad | Documento                                                                                  | Contenido                                                                   |
| :-------: | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
|     1     | [`docs/01-arquitectura-y-estructura.md`](docs/01-arquitectura-y-estructura.md)             | Arquitectura en capas, estructura, refactor, configuración, linter          |
|     2     | [`docs/02-singleton.md`](docs/02-singleton.md)                                             | Patrón Singleton (`RequestManager`), diagramas y pruebas                    |
|     3     | [`docs/03-logging.md`](docs/03-logging.md)                                                 | Logger, convenciones del equipo y reporte de logs                           |
|     4     | [`docs/04-precondiciones-contexto-y-genai.md`](docs/04-precondiciones-contexto-y-genai.md) | Pre/post condiciones, contexto, datasets con GenAI (prompt y procedimiento) |
|     5     | [`docs/05-capas-y-componentes.md`](docs/05-capas-y-componentes.md)                         | Revisión de capas, inventario de pruebas, componentes, guía                 |
|     —     | [`docs/EVALUACION_RUBRICA.md`](docs/EVALUACION_RUBRICA.md)                                 | Autoevaluación contra la rúbrica                                            |

Los diagramas están en Mermaid dentro de cada documento y también sueltos en [`docs/diagrams/`](docs/diagrams) (`.mmd`).

## 1. Requisitos

- Node.js 20 o superior (`node -v`)
- Un token personal de monday.com (Developer Center > API token)

## 2. Puesta en marcha

```bash
npm install                       # instala dependencias y activa los hooks de Husky
cp .env.example .env              # Windows: copy .env.example .env
# edita .env y pega tu token en API_TOKEN=
npm run validate                  # lint + formato + tipos + pruebas del marco (no usa la API)
```

Nunca subas `.env` al repositorio (está en `.gitignore`). Si tu `.env` antiguo define `BASE_URL`, esa variable gana sobre el ambiente: bórrala y usa `TEST_ENV`.

Variables, ambientes (`qa`, `mock`) y capacidades de la cuenta: ver [`docs/01`, sección 6](docs/01-arquitectura-y-estructura.md).

## 3. Cómo ejecutar

```bash
npm test                  # todo: pruebas del marco + pruebas de API (necesita API_TOKEN)
npm run test:unit         # solo las 36 pruebas del marco (sin token)
npm run test:api          # solo las 48 pruebas de API
npm run test:smoke        # AUTH-001, TC-BOARDS-011 y 012
npm run test:create | test:read | test:update | test:e2e
npm run test:dataset      # 28 casos dirigidos por datos (generados con GenAI)

npm run report:logs       # regenera reports/log-report.html y .md
npm run datasets:validate # valida los datasets contra su esquema
npm run lint | lint:fix | format | format:check | typecheck
npm run validate          # todo lo estático + pruebas unitarias
```

Para una sola prueba: `npx jest -t "TC-BOARDS-006"`.

Salidas de cada corrida de API: `reports/report.html`, `reports/junit.xml`, `reports/log-report.html`, `reports/log-report.md`, `logs/execution.log`, `logs/execution.jsonl`.

## 4. Probar el marco sin gastar el límite de monday.com

```bash
# Terminal 1
npm run mock
# Terminal 2
npm run test:mock
```

El mock **no sustituye** la ejecución contra la API real. Para simular las restricciones de permisos de la cuenta real:
`MOCK_DENY=update_board,private_board npm run mock`.

## 5. Estructura

```text
config/environments/   qa.json, mock.json
data/datasets/         datasets JSON y CSV
docs/                  documentación y diagramas
reporters/             LogReporter (resultados al log + reporte)
scripts/               reporte de logs, validación de datasets
src/core/              RequestManager (Singleton)
src/services/          BoardService
src/helpers/           BoardTracker
src/queries/ schemas/ data/   capa de datos
src/config/ logger/ context/ reporting/ utils/   transversales
tests/boards/          pruebas de API
tests/unit/            pruebas del marco
tests/support/         fixtures (pre/postcondiciones)
tests/setup.ts         hooks globales
mock/server.js         servidor falso
poc/                   pruebas de concepto
```

## 6. Qué confirmar contra la API real

Estas pruebas se verificaron contra el mock. En la primera corrida real revisa:

- **403 en `update_board` y boards privados** (visto en el Lab anterior): es un tema de permisos de la cuenta. Corrige el permiso o declara `CAP_UPDATE_BOARD=false` / `CAP_PRIVATE_BOARDS=false`.
- **Casos `either` de los datasets**: los resultados se guardan como eventos `observation` en el log; úsalos para fijar el `expected` definitivo.
- `API_VERSION`: usa la misma que tu colección de Postman.
- TC-BOARDS-009, 011 y 014: ver comentarios en las pruebas.

## 7. CI (GitHub Actions)

`.github/workflows/api-tests.yml`: en cada PR corre lint, formato, tipos, pruebas unitarias, la suite completa contra el mock y la prueba de humo contra la API real; cada noche y a pedido corre la suite completa y sube `reports/` y `logs/`. Crea el secreto `MONDAY_TOKEN` en _Settings > Secrets and variables > Actions_. Los PR desde forks no tienen acceso a secretos.
