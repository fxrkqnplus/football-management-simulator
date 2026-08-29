CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"source" text NOT NULL,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"common_name" text,
	"birth_date" date NOT NULL,
	"nationality_country_id" integer NOT NULL,
	"second_nationality_country_id" integer,
	"birth_city" text,
	"portrait_asset_id" text,
	"portrait_seed" integer NOT NULL,
	"gender" text NOT NULL,
	"person_type" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_key_unique" UNIQUE("key"),
	CONSTRAINT "people_source_check" CHECK ("people"."source" IN ('pack', 'api', 'wikidata', 'openfootball', 'procedural')),
	CONSTRAINT "people_gender_check" CHECK ("people"."gender" IN ('male', 'female')),
	CONSTRAINT "people_person_type_check" CHECK (cardinality("people"."person_type") > 0 AND "people"."person_type" <@ ARRAY['player', 'staff', 'manager', 'chairman']::text[])
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"club_id" integer,
	"squad_number" smallint,
	"primary_position" text NOT NULL,
	"height_cm" smallint NOT NULL,
	"weight_kg" smallint NOT NULL,
	"preferred_foot_right" smallint NOT NULL,
	"preferred_foot_left" smallint NOT NULL,
	"current_ability" smallint NOT NULL,
	"potential_ability" smallint NOT NULL,
	"pa_range_min" smallint NOT NULL,
	"pa_range_max" smallint NOT NULL,
	"is_newgen" boolean NOT NULL,
	"retired_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_person_id_unique" UNIQUE("person_id"),
	CONSTRAINT "players_primary_position_check" CHECK ("players"."primary_position" IN ('GK', 'DC', 'DL', 'DR', 'DM', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR', 'ST'))
);
--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_nationality_country_id_countries_id_fk" FOREIGN KEY ("nationality_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_second_nationality_country_id_countries_id_fk" FOREIGN KEY ("second_nationality_country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;