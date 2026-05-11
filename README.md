# Mirror Trainer Landing

Статический premium-лендинг для продукта «Тренажёр работы через зеркало».

Проект рассчитан на GitHub Pages и не требует сборки. Данные с формы предзаказа и событий аналитики отправляются в Supabase через RPC-функции. Если Supabase ещё не подключён, сайт работает в локальном режиме и сохраняет данные в браузере текущего устройства.

## Что внутри

- Premium dark landing page на чистом `HTML + CSS + JavaScript`
- Адаптивная вёрстка для desktop и mobile
- Sticky header, mobile menu, fade-in анимации, lightbox и success modal
- Сбор заявок на предзаказ и event analytics
- Supabase integration через `public anon key`
- `admin.html` для агрегированной summary-сводки и Excel-экспорта
- SQL schema с таблицами и RPC-функциями

## Структура проекта

```text
.
├── admin.html
├── index.html
├── privacy.html
├── assets
│   ├── css
│   │   ├── admin.css
│   │   └── styles.css
│   ├── favicon.svg
│   ├── images
│   │   ├── cover-prototype.png
│   │   ├── hero-render.png
│   │   ├── product-breakdown.png
│   │   ├── training-process.png
│   │   ├── workbook-closeup.png
│   │   └── workbook-spread.png
│   └── js
│       ├── admin.js
│       ├── app.js
│       ├── config.example.js
│       ├── config.js
│       └── supabase.js
└── sql
    └── supabase-schema.sql
```

## Локальный запуск

Не открывайте `index.html` и `admin.html` напрямую через `file://`.
Для корректной работы кнопок, форм и админки нужен локальный HTTP-server.

Самый простой вариант на macOS:

```bash
bash "/Users/ilqar/Documents/Блокнот/start-local.sh"
```

Также можно просто дважды нажать:

- [start-local.command](/Users/ilqar/Documents/Блокнот/start-local.command)

Если нужен ручной запуск, достаточно поднять любой локальный сервер.

Пример:

```bash
cd /Users/ilqar/Documents/Блокнот
python3 -m http.server 4173
```

После этого откройте:

- `http://127.0.0.1:4173/index.html`
- `http://127.0.0.1:4173/admin.html`

## Настройка Supabase

### 1. Создайте проект в Supabase

Нужен обычный проект с:

- `Project URL`
- `anon public key`
- выполненной SQL-схемой из этого проекта

### 2. Примените SQL schema

Откройте SQL Editor в Supabase и выполните файл:

- [supabase-schema.sql](/Users/ilqar/Documents/Блокнот/sql/supabase-schema.sql)
- [reset-live-data.sql](/Users/ilqar/Documents/Блокнот/sql/reset-live-data.sql)

Что создаётся:

- `leads`
- `feedback_votes`
- `purchase_intent`
- `event_logs`
- `admin_users`
- `admin_credentials`
- RPC-функции для записи и чтения агрегированной сводки

Важно:

- старые таблицы `feedback_votes` и `purchase_intent` остаются в схеме для совместимости
- текущий лендинг и админка их больше не используют
- после апгрейда формы повторно выполните [supabase-schema.sql](/Users/ilqar/Documents/Блокнот/sql/supabase-schema.sql), чтобы в `leads` появились поля `phone` и `telegram`

Если хотите начать с полного нуля уже после запуска, выполните отдельно:

- [reset-live-data.sql](/Users/ilqar/Documents/Блокнот/sql/reset-live-data.sql)

### 3. Проверьте вход в админку

Email Magic Link больше не используется. После выполнения SQL-схемы админка открывается по простому доступу:

- логин: `admin`
- пароль: `714513`

Пароль хранится в Supabase как `pgcrypto` hash в таблице `admin_credentials`.
Клиентская часть отправляет логин и пароль только в RPC-функции чтения админских данных.

### 4. Заполните конфиг

Скопируйте:

- [config.example.js](/Users/ilqar/Documents/Блокнот/assets/js/config.example.js)

в:

- [config.js](/Users/ilqar/Documents/Блокнот/assets/js/config.js)

и подставьте свои значения:

```js
window.APP_CONFIG = {
  siteName: 'Тренажёр работы через зеркало',
  siteUrl: 'https://your-username.github.io/your-repository/',
  contactTelegramUrl: 'https://t.me/your_handle',
  contactTelegramLabel: '@your_handle',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_SUPABASE_PUBLIC_ANON_KEY',
};
```

### 5. Проверьте, что запись работает

После настройки:

1. Откройте сайт.
2. Заполните форму предзаказа.
3. Отправьте заявку.
4. Откройте `admin.html`.
5. Войдите в админку: логин `admin`, пароль `714513`.

Если всё подключено правильно, данные пойдут в Supabase, а summary будет строиться по RPC-функциям
`get_dashboard_snapshot_admin()` и `get_recent_leads_admin()`.

## Какие данные собираются

### Форма заявки

Сохраняются:

- имя
- телефон
- Telegram
- email
- комментарий
- timestamp
- source page
- UTM-метки
- тип устройства
- referrer
- legacy-поле `contact` для совместимости экспорта и старых записей

### Event analytics

Логируются:

- `page_view`
- `cta_click`
- `modal_open`
- `image_open`
- `form_submit`
- `scroll_depth`
- `section_view`

## Admin summary page

Файл:

- [admin.html](/Users/ilqar/Documents/Блокнот/admin.html)

Показывает:

- сколько всего посетителей
- сколько всего заявок
- конверсию формы
- клики по CTA
- глубину скролла
- список последних заявок и предзаказов
- экспорт заявок в `Excel (.xlsx)`

Важно:

- если Supabase не подключён, админка показывает локальные данные из того же браузера
- если Supabase подключён, админка работает как онлайн-кабинет и требует логин/пароль администратора
- для реальных данных от клиентов с разных устройств нужен заполненный `supabaseUrl` и `supabaseAnonKey`
- demo-данные в проекте отключены: пустая база теперь показывает нули, а не фейковые цифры
- для полей `phone` и `telegram` в админке и Excel нужно повторно выполнить обновлённый SQL schema-файл

## Деплой на GitHub Pages

Вариант без сборки:

1. Загрузите проект в GitHub-репозиторий.
2. Убедитесь, что `config.js` заполнен.
3. Убедитесь, что в корне есть файл `.nojekyll`.
4. В GitHub откройте `Settings -> Pages`.
5. В `Build and deployment` выберите `Deploy from a branch`.
6. Укажите нужную ветку и `/root`.
7. После публикации проверьте `index.html` и `admin.html`.
8. Проверьте, что в Supabase выполнена свежая версия `sql/supabase-schema.sql`.

## Что важно обновить перед продом

- Вставить реальные `siteUrl`, `contactTelegramUrl`, `contactTelegramLabel`
- При необходимости поменять пароль администратора в `public.admin_credentials` и в `assets/js/admin.js`
- При необходимости заменить изображения в [assets/images](/Users/ilqar/Documents/Блокнот/assets/images)
- Проверить тексты, FAQ и цену

## Замена изображений

Все изображения лежат в:

- [assets/images](/Users/ilqar/Documents/Блокнот/assets/images)

Текущий layout уже завязан на понятные имена файлов. Проще всего заменять изображения, сохраняя эти же названия:

- `cover-prototype.png`
- `hero-render.png`
- `product-breakdown.png`
- `workbook-spread.png`
- `workbook-closeup.png`
- `training-process.png`

## Ограничения и замечания

- `admin.html` в боевом режиме открывается после локальной проверки логина/пароля, а чтение онлайн-данных дополнительно проверяется в Supabase RPC.
- Для более строгой защиты админки в будущем лучше вынести админ-панель на отдельный backend с серверной сессией.
- Для полного CRM-подобного кабинета с ролями и глубокой фильтрацией уже нужен отдельный backend.
- `supabase anon key` предназначен для публичного фронтенда, это нормально.
- В проекте нет тяжёлых фреймворков и нет обязательного build step.
