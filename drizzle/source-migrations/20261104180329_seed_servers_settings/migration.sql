-- Starter list of RADMIR RP servers (the owner can rename/add/hide them in the admin panel).
INSERT INTO "game_servers" ("name","description","sort_order")
SELECT 'Сервер ' || lpad(n::text, 2, '0'), '', n FROM generate_series(1, 10) AS n
WHERE NOT EXISTS (SELECT 1 FROM "game_servers");
--> statement-breakpoint
-- Move the old free-text server number from profiles to the new reference.
UPDATE "users" u SET "server_id" = gs."id"
FROM "game_servers" gs
WHERE u."server_id" IS NULL AND u."server" ~ '^\s*\D*0*[0-9]{1,3}\s*$'
  AND gs."name" = 'Сервер ' || lpad(ltrim(regexp_replace(u."server", '\D', '', 'g'), '0'), 2, '0');
--> statement-breakpoint
INSERT INTO "settings" ("key","value") VALUES
  ('registrationOpen', 'true'::jsonb),
  ('commentsEnabled', 'true'::jsonb),
  ('ideasEnabled', 'true'::jsonb),
  ('reportsEnabled', 'true'::jsonb),
  ('announcement', '""'::jsonb)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "organizations" ("name","kind","description","sort_order")
SELECT v.name, v.kind, v.description, v.ord FROM (VALUES
  ('МВД', 'gov', 'Полиция: патрулирование, задержания, расследования.', 1),
  ('ГИБДД', 'gov', 'Дорожная полиция: контроль движения, ДТП, штрафы.', 2),
  ('ФСБ', 'gov', 'Федеральная служба безопасности: спецоперации и контрразведка.', 3),
  ('Армия', 'gov', 'Воинская часть: охрана, поставки, учения.', 4),
  ('Больница', 'gov', 'Медицинская помощь, вызовы, медосмотры.', 5),
  ('СМИ', 'gov', 'Новости, эфиры, объявления и интервью.', 6),
  ('Правительство', 'gov', 'Администрация, лицензии, законы и мероприятия.', 7),
  ('ОПГ', 'crime', 'Организованные преступные группировки.', 8)
) AS v(name, kind, description, ord)
WHERE NOT EXISTS (SELECT 1 FROM "organizations");
--> statement-breakpoint
INSERT INTO "game_commands" ("command","description","usage","category")
SELECT v.command, v.description, v.usage, v.category FROM (VALUES
  ('/me', 'Действие персонажа от третьего лица.', '/me достал паспорт из кармана', 'RP-чат'),
  ('/do', 'Описание обстановки или результата действия.', '/do Паспорт в руке.', 'RP-чат'),
  ('/try', 'Действие со случайным исходом: удачно или неудачно.', '/try попытался открыть дверь', 'RP-чат'),
  ('/todo', 'Действие и реплика одновременно.', '/todo Держите*протягивая документы', 'RP-чат'),
  ('/b', 'Нон-РП чат рядом с персонажем.', '/b сек, перезайду', 'Чаты'),
  ('/s', 'Крик — сообщение слышно дальше обычного.', '/s Стоять, полиция!', 'Чаты'),
  ('/w', 'Шёпот — сообщение слышат только рядом стоящие.', '/w Встретимся у банка', 'Чаты')
) AS v(command, description, usage, category)
WHERE NOT EXISTS (SELECT 1 FROM "game_commands");
--> statement-breakpoint
INSERT INTO "roleplays" ("kind","title","category","content","organization_id","created_by")
SELECT v.kind, v.title, v.category, v.content,
  (SELECT o."id" FROM "organizations" o WHERE o."name" = v.org LIMIT 1), 'Владелец'
FROM (VALUES
  ('action', 'Надеть наручники', 'Задержание', E'/me снял наручники с пояса\n/me завёл руки задержанного за спину и надел наручники\n/do Наручники надеты.', 'МВД'),
  ('action', 'Проверка документов', 'Проверка', E'Здравствуйте, предъявите, пожалуйста, ваши документы.\n/me взял документы и внимательно изучил их\n/do Документы в порядке.\n/me вернул документы владельцу', 'ГИБДД'),
  ('action', 'Первая помощь', 'Медицина', E'/me открыл медицинскую сумку\n/me достал бинт и перекись\n/me обработал рану и наложил повязку\n/do Кровотечение остановлено.', 'Больница'),
  ('scenario', 'Собеседование в организацию', 'Собеседование', E'1. Поздоровайтесь и представьтесь.\n2. Попросите паспорт, лицензии и медкарту (/me взял документы…).\n3. Задайте 2–3 вопроса по РП-терминам.\n4. Сообщите решение и выдайте форму.', NULL),
  ('scenario', 'ДТП с пострадавшим', 'ДТП', E'1. ГИБДД ограждает место аварии.\n2. Скорая оказывает помощь пострадавшему.\n3. Участники дают объяснения, составляется протокол.\n4. Эвакуация транспорта.', NULL)
) AS v(kind, title, category, content, org)
WHERE NOT EXISTS (SELECT 1 FROM "roleplays");
