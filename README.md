# Печатная плата

Интерактивный журнал в стиле технической печати 1987 года: микроэлектроника, домашние компьютеры и техническое творчество. Проект входит в организацию [Specialist-PK](https://github.com/Specialist-PK).

Сейчас реализован прототип выпуска `02 / 1987` с тремя учебными статьями. Тексты и векторные иллюстрации созданы с помощью ИИ. Визуальным ориентиром послужила статья А. Волкова «Ваш помощник — компьютер» в [«Моделист-Конструктор», 1987, № 2, с. 19–22](https://mk-archive.narod.ru/mk87/mk8702/mk870219.htm); сканы в репозиторий не включены.

## Возможности

- отдельные Markdown-файлы с YAML frontmatter;
- сборка каталога метаданных и проверка обязательных полей через Vite;
- ленивая загрузка и клиентский рендер выбранной статьи через `markdown-it`;
- JSX без React и виртуального DOM: компоненты возвращают настоящие DOM-узлы;
- пагинация по измеренной высоте блоков с пересчётом после загрузки ресурсов и resize;
- одна страница на узком экране и разворот на широком;
- содержание выпуска, hash-ссылки на статьи и страницы, кнопки и стрелки клавиатуры;
- production-сборка по подпути GitHub Pages и `404.html` как fallback приложения.

## Технологии

- Bun 1.4.4;
- Vite 8 и TypeScript 7;
- `gray-matter` для метаданных во время сборки;
- `markdown-it` для клиентского рендера;
- собственный небольшой JSX-runtime и CSS Modules;
- Vitest и jsdom для модульных проверок;
- Playwright для браузерных сценариев production-сборки.

## Локальный запуск

```sh
bun install
bun run dev
```

Vite выведет адрес dev-сервера, обычно `http://127.0.0.1:5173`.

Проверка и production-просмотр:

```sh
bun run typecheck
bun run test
bun run build
bun run preview
```

Проверка варианта GitHub Pages по подпути:

```sh
BASE_PATH=/pechatnaya-plata/ bun run build
BASE_PATH=/pechatnaya-plata/ bun run preview
```

Перед первым запуском Playwright установите Chromium командой `bun run test:e2e:install`. Если Chromium уже установлен в системе, можно передать его путь через `CHROME_PATH`:

```sh
bun run test:e2e
# или
CHROME_PATH=/usr/bin/chromium bun run test:e2e
```

Playwright сам собирает production-версию по `/pechatnaya-plata/`, запускает preview на `127.0.0.1:4173` и останавливает его после проверок. Trace при ошибках сохраняется в `test-results/`.

## Структура

```text
content/articles/<slug>/
  index.md               статья с frontmatter
  media/                 изображения и схемы только этой статьи
public/                  общие ресурсы сайта
src/components/          DOM-компоненты и CSS Modules
src/content/             каталог, медиа, lazy-загрузка и Markdown renderer
src/lib/jsx/             JSX-runtime без виртуального DOM
src/lib/paginate.ts      распределение блоков по страницам
e2e/                     пользовательские сценарии Playwright
tools/ci/                выбор CI jobs по изменённым файлам
docs/adr/                архитектурные решения и их контекст
scripts/                 финализация production-сборки
.github/workflows/       CI и деплой на GitHub Pages
```

Импорты между модулями `src` используют абсолютные алиасы `@components`, `@content` и `@lib`. Относительные импорты остаются только для файлов внутри одного модуля, например CSS Modules. Алиасы синхронизированы в `tsconfig.json` и `vite.config.ts`.

## Добавление статьи

Создайте каталог `content/articles/<slug>/` и файл `index.md` внутри него. Имя каталога становится постоянным `slug` и используется в hash-маршруте. Изображения статьи размещайте в её подкаталоге `media/`.

```md
---
title: "Название статьи"
description: "Краткое описание"
issue: "02 / 1987"
published: "1987-02-04"
rubric: "Техническое творчество"
authors:
  - "Имя автора"
startPage: 55
hero: "media/hero.svg"
---

Текст статьи.
```

Обязательные поля: `title`, `description`, `issue`, `published`, `rubric`, `authors`. Необязательные: `startPage`, `hero`, `draft: true`. Полная статья загружается только при открытии, а в исходный каталог попадают только метаданные.

Изображения из каталога статьи указываются относительно `media/`:

```md
![Подпись к схеме](media/memory-map.svg)
```

Vite выпускает медиа как assets, а `resolveArticleMedia()` связывает их с конкретной статьёй и учитывает `BASE_PATH`. Сырой HTML в Markdown отключён. Номера страниц зависят от ширины экрана, поэтому `startPage` задаёт только номер первой страницы статьи.

## Процесс разработки

Планы находятся в закреплённом [Roadmap issue #4](https://github.com/Specialist-PK/pechatnaya-plata/issues/4). Каждая задача проходит последовательность **issue → ветка от свежего `main` → pull request с `Closes #N` → зелёный aggregate `ci` → squash merge**. Заголовки коммитов и PR — английские Conventional Commits, описание PR — русское по шаблону.

Значимые архитектурные решения записываются в [`docs/adr/`](docs/adr/README.md). Шаблоны Task и Bug находятся в `.github/ISSUE_TEMPLATE/`.

CI выбирает jobs по изменённым файлам через покрытые тестами правила `tools/ci/src/select.ts`:

- `test` — TypeScript и Vitest;
- `web` — production-сборка и Playwright;
- `ci` — aggregate gate, принимающий `success` и `skipped`.

Неизвестный путь запускает все проверки. При добавлении новых каталогов правила и их тесты обновляются в том же изменении.

## Деплой на GitHub Pages

Workflow `.github/workflows/deploy.yml` запускается для pull requests, после push в `main` и вручную. В PR он проверяет TypeScript, Vitest, production-сборку с `BASE_PATH` от `actions/configure-pages` и Playwright, но не публикует сайт. Job `deploy` выполняется только вне pull request и публикует `dist/` через `actions/deploy-pages`.

Перед первым запуском выберите **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Сайт будет доступен по адресу `https://specialist-pk.github.io/pechatnaya-plata/`.

## Контент, созданный с помощью ИИ

Для этого репозитория действует локальное исключение из общей политики организации: разрешены любые ИИ-тексты, код и медиаматериалы. Синтетические материалы не следует выдавать за подлинные исторические документы. Права на сторонние заимствования должны быть подтверждены отдельно.
