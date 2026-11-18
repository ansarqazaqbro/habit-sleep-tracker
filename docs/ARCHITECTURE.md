# Architecture Overview

## Общая схема

Проект разделён на независимые **Backend** (Laravel 13 REST API) и **Frontend** (React 19 + Vite SPA).

## Backend (`backend/`)

- **Controllers (`app/Http/Controllers/Api/`)**: тонкий HTTP-слой, принимающий FormRequest-валидацию, проверяющий права через `Gate::authorize` и возвращающий JSON Resources.
- **Services (`app/Services/`)**: бизнес-логика приложения:
  - `HabitService` — CRUD-операции над привычками.
  - `StreakService` — транзакционный пересчёт `streak_count` и `best_streak`.
  - `SleepAnalyticsService` — расчёт недельной сводки сна, медианы отхода ко сну и процента регулярности.
  - `ActivityMatrixService` — построение тепловой матрицы активности.
  - `AiService` и `AiPlanService` — генерация рекомендаций и выполнение действий консультанта.
- **Policies (`app/Policies/`)**: `HabitPolicy`, `SleepLogPolicy` — проверка владения ресурсом.
- **Middleware**: `EnsureUserIsAdmin` для административных маршрутов `/api/admin/*`.

## Frontend (`frontend/src/`)

- **`lib/api.js`**: обёртка над `fetch` с таймаутом (15 сек), автоматическим восстановлением демо-сессии при `401` и обработкой ошибок.
- **`lib/sound.js`**: синтез лёгких стеклянных и колокольчиковых UI-звуков через Web Audio API.
- **`context/ThemeContext.jsx`**: управление темой (`dark` / `light`) с сохранением в `localStorage`.
- **`components/liquid/`**: переиспользуемые glassmorphic-компоненты (`LiquidCard`, `LiquidButton`, `LiquidLensFilters`).
- **`components/habits/` & `components/sleep/` & `components/ai/`**: модульные панели дашборда.
