-- Root section «ЭКСКЛЮЗИВ — АХК для всех организаций», linked from the header next to the car catalog.
SELECT setval(pg_get_serial_sequence('"nodes"', 'id'), GREATEST((SELECT COALESCE(MAX("id"), 0) FROM "nodes"), 1));
--> statement-breakpoint
INSERT INTO "nodes" ("parent_id","kind","title","summary","content","icon","sort_order","created_by")
SELECT NULL,'section','ЭКСКЛЮЗИВ — АХК для всех организаций','Эксклюзивные АХК для каждой организации','','crown',
  COALESCE((SELECT MAX("sort_order") FROM "nodes" WHERE "parent_id" IS NULL), 0) + 1,'Владелец'
WHERE NOT EXISTS (SELECT 1 FROM "nodes" WHERE "parent_id" IS NULL AND "title" ILIKE '%АХК%');
