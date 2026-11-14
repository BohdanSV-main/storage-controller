# Комора

Сервіс резервування товарів складу: каталог, бронювання, скасування та видача працівником.
Бекенд - Fastify, TypeScript, PostgreSQL і Prisma; фронтенд на React.
Є прототип у пам’яті, транзакції, ідемпотентність і обробка збоїв БД.

## Підготовка

Потрібні Node.js 24, npm 11 і PostgreSQL 17.
У `psql` під адміністратором створити користувача та бази:

```sql
CREATE ROLE storage_app LOGIN;
\password storage_app
CREATE DATABASE storage_controller OWNER storage_app;
CREATE DATABASE storage_controller_shadow OWNER storage_app;
```

У корені проєкту:

У `.env` вказати пароль у `DATABASE_URL` і `SHADOW_DATABASE_URL`,
випадковий `SESSION_SECRET` від 32 символів та `APP_ORIGIN=http://127.0.0.1:5173`.
Спеціальні символи пароля в URL потрібно URL-кодувати. `.env` не додавати до Git.

```powershell
npx prisma migrate deploy
npm run db:seed
npm start
```

`db:seed` генерує Prisma Client, збирає бекенд і додає початкові дані.
Після змін бекенду перед запуском виконати `npm run build`.

## Прототип без БД

У `.env` встановити:
```env
DATA_SOURCE=memory
```

```powershell
npm run db:generate
npm run build
npm start
```

Генерація Prisma Client потрібна тільки для збірки, але підключення до БД не буде бо дані та сесії зберігаються в пам'яті.
Для роботи з PostgreSQL встановити DATA_SOURCE=postgres.
Рівень логування: LOG_LEVEL=info. Для детальних логів сервісу й репозиторію використати LOG_LEVEL=debug.

## Фронтенд

В іншому терміналі:

```powershell
cd frontend
npm ci
npm run dev
```

Інтерфейс: http://127.0.0.1:5173. API: http://127.0.0.1:3000.
Перевірка сервера: `/health`; версія коміта: `/version`.

## Seed акаунти

| Роль | Email | Пароль |
| --- | --- | --- |
| Користувач | biba@example.com | User-one-123! |
| Користувач | boba@example.com | User-two-123! |
| Працівник | worker@example.com | Worker-123! |

Seed не змінює паролі наявних акаунтів.

## Тестування

Для інтеграційних та E2E-тестів потрібна окрема БД storage_controller_test.
У .env.test вкажіть DATABASE_URL цієї БД та налаштування сесії.

Підготовка:

```sh
npm run db:test:prepare
npm run test:prepare

## Перевірки

- `npm run check` або `make check`  форматування, lint, типи, 67 тестів й збірка бекенду.
- `npm run test:db`  8 тестів PostgreSQL разом з N+1; потрібна налаштована `.env` і міграції. Тестові записи очищаються.
- `npm --prefix frontend run check`  форматування, lint, типи й збірка фронтенду.
- `npm run test:prepare`  міграції тестової БД та встановлення Chromium; потрібна `.env.test` із DATABASE_URL для storage_controller_test.
- `npm run test:coverage`  покриття коду, включно з гілками.
- `npm run test:e2e`  4 сценарії у Chromium; порти 3000 і 4173 мають бути вільні.
- `npm run mutation` або `make mutation`  мутаційні перевірки сервісу резервування та числових меж.

## Документація

[Специфікація](spec.md) · [API](docs/api.md) · [ADR](docs/adr/) ·
[Аудит](docs/backend-audit.md) · [Збої БД](docs/database-failures.md) · [Аудит тестів](docs/testing-audit.md) · 
[Результати перевірок](docs/artifacts/lab2-checks.md)
[Definition of Done](standards/definition-of-done.md)
