-- Default home page shortcut buttons. The owner can change them on the home page.
INSERT INTO "quick_links" ("title", "text", "url", "icon", "sort_order") VALUES
('Каталог авто', 'Цены, ID и характеристики', '/cars', 'car-front', 0),
('Таблицы ивентов', 'Рейтинги и итоги', '/events/tables', 'table', 1),
('Призы', 'Что можно выиграть', '/events/prizes', 'gift', 2),
('Предложить идею', 'Ваша RP-идея на сайте', '/ideas/new', 'lightbulb', 3),
('Избранное', 'Ваши сохранённые темы', '/favorites', 'heart', 4);
