# ЛР4. Перевірка блокування мерджа

PR: [(https://github.com/BohdanSV-main/storage-controller/pull/7)]

| Перевірка | Результат | Доказ |
| --- | --- | --- |
| Додав `exit 1` до job-и `backend` | `backend` впав, Злиття в `main` заблоковано | [Червоний прогін](https://github.com/BohdanSV-main/storage-controller/actions/runs/45824527494/job/139925159206?pr=7) |
| Прибрав `exit 1` | Усі перевірки пройдені | [Зелений прогін](https://github.com/BohdanSV-main/storage-controller/actions/runs/45825641624/job/139928966008?pr=7) |


![GitHub блокує злиття через невдалу перевірку backend](lab4-merge-blocked.png)

## Перший деплой

- Що пропустив. CI перевіряв `/ready` і `/version`, а Playwright запускав фронтенд окремо через Vite. Перевірки проходили, хоча в Docker-образі не було React і не відкривалася форма входу.
- Що виправив. У `372a660` додали збірку React в образ. Fastify віддає інтерфейс під `/app/` та API під `/api`.
- Як перевірив. CI відкриває головну сторінку контейнера, завантажує її JS і перевіряє, що `/api/auth/me` без сесії повертає `401`.

## Деплой main

Після мерджа PR #7 у main пройшов CI. Render автоматично розгорнув коміт `0c7d4de`. Після деплою `/ready` повернув ready, а `/version` підтвердив SHA мердж-коміту.