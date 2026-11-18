# Lumen — Habit & Sleep Tracker

Курсовой веб-проект в стиле visionOS / liquid glass: Laravel REST API + React (Tailwind, Framer Motion, Recharts).

## Стек

- Backend: Laravel 13, Sanctum, SQLite
- Frontend: Vite + React 19, Tailwind CSS 4, Framer Motion, Lucide, Recharts

## Запуск

Нужны PHP 8.3+ (расширения: curl, openssl, mbstring, pdo_sqlite, fileinfo, zip) и Node.js 20+.

```bash
cd backend
copy .env.example .env   # если ещё нет
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Во втором терминале:

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173. Фронт проксирует `/api` на `http://127.0.0.1:8000`.

Демо-вход создаётся автоматически: `demo@habit.local` / `password`.

## API

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/api/auth/demo` | Токен демо-пользователя |
| GET | `/api/habits` | Список привычек + стрик |
| POST | `/api/habits/{id}/toggle` | Чек привычки и пересчёт стрика |
| GET | `/api/sleep/stats` | Средние, регулярность, история графика |
| POST | `/api/sleep` | Лог ночи |
| GET | `/api/matrix` | Квадратики активности 0.0–1.0 |

## Интерфейс

- `LiquidCard` / `LiquidButton` — линза, хроматическая кромка, блик за курсором
- Темы: Vision Dark, Vision Light, Aurora Gradient
- Сон: модалка, график, рекомендации недели
- Привычки: стрики и тепловая матрица

## Структура проекта

- `backend/` — Laravel 13 REST API (контроллеры, сервисы, политики, тесты)
- `frontend/` — React 19 + Vite SPA в стиле visionOS / liquid glass
- `bruno_collection/` — коллекция HTTP-запросов для Bruno
- `docs/` — документация по API и архитектуре

## Тестирование

```bash
cd backend
php artisan test
```

Подробнее о разработке и структуре читайте в [CONTRIBUTING.md](CONTRIBUTING.md) и [CHANGELOG.md](CHANGELOG.md).
