# Contributing to Lumen — Habit & Sleep Tracker

Спасибо за интерес к проекту! Ниже описаны базовые правила для локальной разработки и внесения изменений.

## Требования

- PHP 8.3+ (`curl`, `openssl`, `mbstring`, `pdo_sqlite`, `fileinfo`, `zip`)
- Composer
- Node.js 20+ и npm

## Локальный запуск

1. Настройка backend:
   ```bash
   cd backend
   composer install
   copy .env.example .env
   php artisan key:generate
   php artisan migrate --seed
   php artisan serve
   ```
2. Настройка frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Тесты и проверки

- Backend тесты:
  ```bash
  cd backend
  php artisan test
  ```
- Frontend сборка и линтинг:
  ```bash
  cd frontend
  npm run lint
  npm run build
  ```

## Стиль коммитов

Используйте формат Conventional Commits:
- `feat:` — новая функциональность
- `fix:` — исправление ошибки
- `docs:` — документация
- `refactor:` — рефакторинг без изменения поведения
- `test:` — добавление или обновление тестов
- `chore:` — инфраструктура и конфигурация
