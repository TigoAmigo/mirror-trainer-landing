# Mirror Trainer Landing

Статический premium-лендинг для продукта «Тренажёр работы через зеркало».

Проект рассчитан на GitHub Pages и не требует сборки. Данные с формы, опросов и событий аналитики отправляются в Supabase через RPC-функции. Если Supabase ещё не подключён, сайт работает в локальном режиме и сохраняет данные в браузере текущего устройства.

## Что внутри

- Premium dark landing page на чистом `HTML + CSS + JavaScript`
- Адаптивная вёрстка для desktop и mobile
- Sticky header, mobile menu, fade-in анимации, lightbox, modal form
- Сбор заявок, опроса интереса, purchase intent и event analytics
- Supabase integration через `public anon key`
- `admin.html` для агрегированной summary-сводки
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
- включённым `Email auth` для входа в админку

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
- RPC-функции для записи и чтения агрегированной сводки

Если хотите начать с полного нуля уже после запуска, выполните отдельно:

- [reset-live-data.sql](/Users/ilqar/Documents/Блокнот/sql/reset-live-data.sql)

### 3. Настройте Auth для админки

В Supabase откройте:

- `Authentication -> URL Configuration`

Добавьте:

- `Site URL`: `https://tigoamigo.github.io/mirror-trainer-landing/`
- `Redirect URL`: `https://tigoamigo.github.io/mirror-trainer-landing/admin.html`

Если хотите тестировать вход локально через `http://127.0.0.1:4173`, добавьте ещё и локальный redirect:

- `http://127.0.0.1:4173/admin.html`

После этого добавьте свой email в список админов через SQL Editor:

```sql
insert into public.admin_users (email)
values ('you@example.com')
on conflict (email) do nothing;
```

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
2. Нажмите вариант в блоке интереса.
3. Нажмите вариант в блоке purchase intent.
4. Отправьте форму.
5. Откройте `admin.html`.
6. Войдите в админку по email из таблицы `admin_users`.

Если всё подключено правильно, данные пойдут в Supabase, а summary будет строиться по RPC-функции `get_dashboard_snapshot()`.

## Какие данные собираются

### Форма заявки

Сохраняются:

- имя
- Telegram или телефон
- email
- комментарий
- timestamp
- source page
- UTM-метки
- тип устройства
- referrer
- текущий ответ из блока interest
- текущий ответ из блока purchase intent

### Опрос интереса

Сохраняются варианты:

- Очень интересно
- Скорее интересно
- Нейтрально
- Неинтересно

### Purchase intent

Сохраняются варианты:

- Да, купил(а) бы
- Возможно, если будут отзывы / подробности
- Возможно, если будет ниже цена
- Нет

### Event analytics

Логируются:

- `page_view`
- `cta_click`
- `modal_open`
- `image_open`
- `form_submit`
- `feedback_vote_select`
- `purchase_intent_select`
- `scroll_depth`
- `section_view`

## Admin summary page

Файл:

- [admin.html](/Users/ilqar/Documents/Блокнот/admin.html)

Показывает:

- сколько всего заявок
- сколько выбрали `Очень интересно`
- сколько ответили `Да, купил(а) бы`
- сколько ответили `Возможно, если будет ниже цена`
- конверсию формы
- клики по CTA
- глубину скролла
- список последних заявок и предзаказов

Важно:

- если Supabase не подключён, админка показывает локальные данные из того же браузера
- если Supabase подключён, админка работает как онлайн-кабинет и требует вход по email администратора
- для реальных данных от клиентов с разных устройств нужен заполненный `supabaseUrl` и `supabaseAnonKey`
- demo-данные в проекте отключены: пустая база теперь показывает нули, а не фейковые цифры

## Деплой на GitHub Pages

Вариант без сборки:

1. Загрузите проект в GitHub-репозиторий.
2. Убедитесь, что `config.js` заполнен.
3. Убедитесь, что в корне есть файл `.nojekyll`.
4. В GitHub откройте `Settings -> Pages`.
5. В `Build and deployment` выберите `Deploy from a branch`.
6. Укажите нужную ветку и `/root`.
7. После публикации проверьте `index.html` и `admin.html`.
8. Проверьте, что в Supabase Auth добавлены `Site URL` и `Redirect URL` для `admin.html`.

## Что важно обновить перед продом

- Вставить реальные `siteUrl`, `contactTelegramUrl`, `contactTelegramLabel`
- При необходимости заменить email администратора в `public.admin_users`
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

- `admin.html` в боевом режиме должен открываться только после входа через Supabase Auth.
- Для полного CRM-подобного кабинета с ролями и глубокой фильтрацией уже нужен отдельный backend.
- `supabase anon key` предназначен для публичного фронтенда, это нормально.
- В проекте нет тяжёлых фреймворков и нет обязательного build step.
