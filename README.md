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
- собственный небольшой JSX-runtime и CSS Modules.

## Локальный запуск

```sh
bun install
bun run dev
```

Vite выведет адрес dev-сервера, обычно `http://127.0.0.1:5173`.

Проверка и production-просмотр:

```sh
bun run typecheck
bun run build
bun run preview
```

Проверка варианта GitHub Pages по подпути:

```sh
BASE_PATH=/pechatnaya-plata/ bun run build
BASE_PATH=/pechatnaya-plata/ bun run preview
```

## Структура

```text
content/articles/        Markdown-статьи с frontmatter
public/images/           SVG-иллюстрации и схемы
src/components/          DOM-компоненты и CSS Modules
src/content/             каталог, ленивая загрузка и Markdown renderer
src/lib/jsx/             JSX-runtime без виртуального DOM
src/lib/paginate.ts      распределение блоков по страницам
scripts/                 финализация production-сборки
.github/workflows/       деплой на GitHub Pages
```

## Добавление статьи

Создайте `content/articles/<slug>.md`. Имя файла становится постоянным `slug` и используется в hash-маршруте.

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
hero: "images/hero-computer.svg"
---

Текст статьи.
```

Обязательные поля: `title`, `description`, `issue`, `published`, `rubric`, `authors`. Необязательные: `startPage`, `hero`, `draft: true`. Полная статья загружается только при открытии, а в исходный каталог попадают только метаданные.

Изображения из `public/` указываются без учёта базового пути:

```md
![Подпись к схеме](images/memory-map.svg)
```

Сырой HTML в Markdown отключён. Номера страниц зависят от ширины экрана, поэтому `startPage` задаёт только номер первой страницы статьи.

## Деплой на GitHub Pages

Workflow `.github/workflows/deploy.yml` запускается после push в `main` и вручную. Он устанавливает Bun, проверяет TypeScript, собирает `dist/` с `BASE_PATH` от `actions/configure-pages` и публикует артефакт через `actions/deploy-pages`.

Перед первым запуском выберите **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Сайт будет доступен по адресу `https://specialist-pk.github.io/pechatnaya-plata/`.

## Контент, созданный с помощью ИИ

Для этого репозитория действует локальное исключение из общей политики организации: разрешены любые ИИ-тексты, код и медиаматериалы. Синтетические материалы не следует выдавать за подлинные исторические документы. Права на сторонние заимствования должны быть подтверждены отдельно.
