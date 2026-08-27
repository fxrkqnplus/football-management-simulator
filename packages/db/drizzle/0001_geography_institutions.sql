CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"source" text NOT NULL,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"country_id" integer,
	"code" text NOT NULL,
	"name_key" text NOT NULL,
	"type" text NOT NULL,
	"tier" integer,
	"reputation" integer NOT NULL,
	"logo_asset_id" text,
	"rules" jsonb NOT NULL,
	"season_start_month" smallint NOT NULL,
	"season_end_month" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competitions_key_unique" UNIQUE("key"),
	CONSTRAINT "competitions_code_unique" UNIQUE("code"),
	CONSTRAINT "competitions_source_check" CHECK ("competitions"."source" IN ('pack', 'api', 'wikidata', 'openfootball', 'procedural')),
	CONSTRAINT "competitions_type_check" CHECK ("competitions"."type" IN ('league', 'domestic_cup', 'league_cup', 'super_cup', 'continental'))
);
--> statement-breakpoint
CREATE TABLE "federations" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"name" text NOT NULL,
	"founded_year" integer,
	"asset_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "source" text NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "confederation" text NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "flag_asset_id" text;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "football_level" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "uefa_coefficient" numeric(8, 3) NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "currency_code" char(3) NOT NULL;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "work_permit_rule_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federations" ADD CONSTRAINT "federations_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_source_check" CHECK ("countries"."source" IN ('pack', 'api', 'wikidata', 'openfootball', 'procedural'));--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_work_permit_rule_key_check" CHECK ("countries"."work_permit_rule_key" IN ('gbe', 'eu_quota', 'tr_quota', 'none'));