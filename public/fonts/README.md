# Локальные шрифты

- **PT Serif** — основной текст, начертания regular 400, bold 700 и italic 400.
- **PT Sans Narrow** — заголовки и служебные элементы, начертания regular 400 и bold 700.

Для каждого начертания размещены кириллический и латинский наборы WOFF2 от Google Fonts v19. Файлы не изменялись и не подвергались дополнительному субсетингу. CSS в `src/fonts.css` выбирает нужный файл через `unicode-range`; внешние font-сервисы при работе сайта не используются.

Источники:

- https://github.com/google/fonts/tree/main/ofl/ptserif
- https://github.com/google/fonts/tree/main/ofl/ptsansnarrow
- https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400&family=PT+Sans+Narrow:wght@400;700&display=swap

Лицензии SIL Open Font License сохранены в `PT-Serif-OFL.txt` и `PT-Sans-Narrow-OFL.txt`.
