# API Reference — Lumen Habit & Sleep Tracker

Базовый префикс всех маршрутов: `/api`.  
Аутентификация: Laravel Sanctum (`Authorization: Bearer <token>`).

## Публичные маршруты

| Метод | Путь | Описание |
| --- | --- | --- |
| `POST` | `/api/register`, `/api/auth/register` | Регистрация нового пользователя и выдача токена |
| `POST` | `/api/login`, `/api/auth/login` | Вход по email и паролю |
| `POST` | `/api/auth/demo` | Создание/получение демо-пользователя (`demo@habit.local`) и токена |

## Защищённые маршруты (`auth:sanctum`)

### Пользователь и категории
| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/user` | Профиль текущего пользователя |
| `POST` | `/api/logout`, `/api/auth/logout` | Отзыв текущего токена доступа |
| `GET` | `/api/categories` | Список доступных категорий привычек |

### Привычки (`/api/habits`)
| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/habits` | Список привычек пользователя |
| `POST` | `/api/habits` | Создание новой привычки |
| `GET` | `/api/habits/{habit}` | Детали конкретной привычки |
| `PATCH` / `PUT` | `/api/habits/{habit}` | Обновление привычки |
| `DELETE` | `/api/habits/{habit}` | Удаление привычки |
| `POST` | `/api/habits/{habit}/toggle` | Отметка выполнения за дату и пересчёт стрика |

### Сон и матрица активности
| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/sleep` | Последние 60 записей сна |
| `POST` | `/api/sleep` | Создание или обновление записи сна за дату |
| `GET` | `/api/sleep/{sleep}` | Детали записи сна |
| `PATCH` / `PUT` | `/api/sleep/{sleep}` | Обновление записи сна |
| `DELETE` | `/api/sleep/{sleep}` | Удаление записи сна |
| `GET` | `/api/sleep/stats` | Недельная статистика сна и регулярность |
| `GET` | `/api/matrix` | Тепловая матрица активности (параметр `weeks`, по умолчанию 16) |

### AI-консультант (rate limit: 30 req/min)
| Метод | Путь | Описание |
| --- | --- | --- |
| `GET` | `/api/ai/advice` | Краткая AI-сводка и оценка для карточки сна |
| `POST` | `/api/ai/advisor` | Диалог с AI-консультантом и выполнение агентных действий |
| `POST` | `/api/ai/actions/{action}/confirm` | Подтверждение предложенного действия |
| `POST` | `/api/ai/actions/{action}/undo` | Отмена выполненного действия |

### Администрирование (`admin` middleware)
| Метод | Путь | Описание |
| --- | --- | --- |
| `apiResource` | `/api/admin/categories` | CRUD-управление категориями |
