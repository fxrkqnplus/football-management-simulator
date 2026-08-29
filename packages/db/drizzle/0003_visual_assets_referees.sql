CREATE TABLE "club_kits" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer NOT NULL,
	"kit_type" text NOT NULL,
	"template_id" integer NOT NULL,
	"color1" char(7) NOT NULL,
	"color2" char(7) NOT NULL,
	"color3" char(7),
	"asset_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_kits_club_id_kit_type_unique" UNIQUE("club_id","kit_type"),
	CONSTRAINT "club_kits_kit_type_check" CHECK ("club_kits"."kit_type" IN ('home', 'away', 'third'))
);
--> statement-breakpoint
CREATE TABLE "kit_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_key" text NOT NULL,
	"svg_path" text NOT NULL,
	"color_slots" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kit_templates_code_unique" UNIQUE("code"),
	CONSTRAINT "kit_templates_color_slots_check" CHECK ("kit_templates"."color_slots" IN (2, 3))
);
--> statement-breakpoint
CREATE TABLE "referees" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"source" text NOT NULL,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"country_id" integer NOT NULL,
	"strictness" smallint NOT NULL,
	"foul_tolerance" smallint NOT NULL,
	"home_bias" smallint NOT NULL,
	"consistency" smallint NOT NULL,
	"advantage_play" smallint NOT NULL,
	"big_game_experience" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referees_key_unique" UNIQUE("key"),
	CONSTRAINT "referees_source_check" CHECK ("referees"."source" IN ('pack', 'api', 'wikidata', 'openfootball', 'procedural'))
);
--> statement-breakpoint
ALTER TABLE "club_kits" ADD CONSTRAINT "club_kits_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_kits" ADD CONSTRAINT "club_kits_template_id_kit_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."kit_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referees" ADD CONSTRAINT "referees_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;