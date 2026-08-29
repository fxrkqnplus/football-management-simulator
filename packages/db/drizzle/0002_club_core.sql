CREATE TABLE "club_facilities" (
	"club_id" integer PRIMARY KEY NOT NULL,
	"training_ground" smallint NOT NULL,
	"youth_academy" smallint NOT NULL,
	"youth_recruitment" smallint NOT NULL,
	"medical_centre" smallint NOT NULL,
	"data_analysis" smallint NOT NULL,
	"stadium_quality" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club_finances_base" (
	"club_id" integer PRIMARY KEY NOT NULL,
	"balance" bigint NOT NULL,
	"transfer_budget" bigint NOT NULL,
	"wage_budget" bigint NOT NULL,
	"matchday_income_annual" bigint NOT NULL,
	"tv_income_annual" bigint NOT NULL,
	"sponsor_income_annual" bigint NOT NULL,
	"merchandise_income_annual" bigint NOT NULL,
	"currency_code" char(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"source" text NOT NULL,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"competition_id" integer,
	"country_id" integer NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"abbreviation" char(3) NOT NULL,
	"founded_year" integer,
	"city" text NOT NULL,
	"stadium_id" integer,
	"reputation" integer NOT NULL,
	"color_primary" char(7) NOT NULL,
	"color_secondary" char(7) NOT NULL,
	"color_tertiary" char(7),
	"crest_asset_id" text,
	"crest_seed" integer NOT NULL,
	"supporter_count" integer NOT NULL,
	"supporter_expectation" integer NOT NULL,
	"is_national" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_key_unique" UNIQUE("key"),
	CONSTRAINT "clubs_source_check" CHECK ("clubs"."source" IN ('pack', 'api', 'wikidata', 'openfootball', 'procedural'))
);
--> statement-breakpoint
CREATE TABLE "rivalries" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_a_id" integer NOT NULL,
	"club_b_id" integer NOT NULL,
	"intensity" smallint NOT NULL,
	"name_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stadiums" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"source" text NOT NULL,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"capacity" integer NOT NULL,
	"seated_capacity" integer NOT NULL,
	"pitch_quality" smallint NOT NULL,
	"built_year" integer,
	"asset_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stadiums_key_unique" UNIQUE("key"),
	CONSTRAINT "stadiums_source_check" CHECK ("stadiums"."source" IN ('pack', 'api', 'wikidata', 'openfootball', 'procedural'))
);
--> statement-breakpoint
ALTER TABLE "club_facilities" ADD CONSTRAINT "club_facilities_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_finances_base" ADD CONSTRAINT "club_finances_base_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_stadium_id_stadiums_id_fk" FOREIGN KEY ("stadium_id") REFERENCES "public"."stadiums"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rivalries" ADD CONSTRAINT "rivalries_club_a_id_clubs_id_fk" FOREIGN KEY ("club_a_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rivalries" ADD CONSTRAINT "rivalries_club_b_id_clubs_id_fk" FOREIGN KEY ("club_b_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;