# Changelog

Все заметные изменения проекта **Lumen — Habit & Sleep Tracker** фиксируются в этом файле.

## [Unreleased]
- Добавлена конфигурация форматирования (`.editorconfig`, `.gitattributes`).
- Расширена документация проекта и справочник API.

## [1.1.0] — UI Refactor & AI Consultant
- Рефакторинг интерфейса в стиле visionOS / liquid glass (`LiquidCard`, `LiquidButton`, `LiquidLensFilters`).
- Добавлен AI-консультант Lumen (`AiAdviceController`, `AiPlanService`, `AiAdvisorWidget`) с инструментами создания привычек и логирования сна.
- Добавлена коллекция запросов Bruno (`bruno_collection/`) для тестирования API.

## [1.0.0] — Initial Release
- Реализован REST API на Laravel 13 с аутентификацией через Sanctum.
- Реализован учёт привычек с подсчётом стриков (`StreakService`) и тепловой матрицей активности (`ActivityMatrixService`).
- Реализован трекинг сна и недельная аналитика (`SleepAnalyticsService`).
- Реализован фронтенд на React 19, Vite, Tailwind CSS 4, Framer Motion и Recharts.
