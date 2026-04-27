INSERT INTO "app_settings" ("key", "value")
VALUES ('app_title', 'ccbricks')
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "app_settings" ("key", "value")
VALUES ('welcome_heading', 'Claude Code on Databricks')
ON CONFLICT ("key") DO NOTHING;
