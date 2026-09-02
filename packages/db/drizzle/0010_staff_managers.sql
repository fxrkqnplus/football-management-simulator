CREATE TABLE "manager_attributes" (
	"manager_id" integer PRIMARY KEY NOT NULL,
	"tactical_knowledge" smallint NOT NULL,
	"motivation" smallint NOT NULL,
	"player_management" smallint NOT NULL,
	"youth_development" smallint NOT NULL,
	"negotiating" smallint NOT NULL,
	"media_handling" smallint NOT NULL,
	"training_management" smallint NOT NULL,
	"judging_ability" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"club_id" integer,
	"is_user_manager" boolean NOT NULL,
	"coaching_badge" text NOT NULL,
	"experience_level" text NOT NULL,
	"philosophy" text NOT NULL,
	"reputation" smallint NOT NULL,
	"experience_points" integer NOT NULL,
	"spoken_languages" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managers_coaching_badge_check" CHECK ("managers"."coaching_badge" IN ('none', 'c', 'b', 'a', 'pro')),
	CONSTRAINT "managers_experience_level_check" CHECK ("managers"."experience_level" IN ('amateur', 'former_player_lower', 'former_player_mid', 'former_player_top', 'professional'))
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"club_id" integer,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_role_check" CHECK ("staff"."role" IN ('assistant_manager', 'attacking_coach', 'defending_coach', 'fitness_coach', 'gk_coach', 'technical_coach', 'physio', 'sports_scientist', 'scout', 'data_analyst', 'youth_manager', 'youth_coach'))
);
--> statement-breakpoint
CREATE TABLE "staff_attributes" (
	"staff_id" integer PRIMARY KEY NOT NULL,
	"attacking" smallint NOT NULL,
	"defending" smallint NOT NULL,
	"fitness" smallint NOT NULL,
	"goalkeeping" smallint NOT NULL,
	"technical" smallint NOT NULL,
	"tactical" smallint NOT NULL,
	"motivating" smallint NOT NULL,
	"discipline" smallint NOT NULL,
	"judging_ability" smallint NOT NULL,
	"judging_potential" smallint NOT NULL,
	"physiotherapy" smallint NOT NULL,
	"sports_science" smallint NOT NULL,
	"scouting_network" smallint NOT NULL,
	"adaptability" smallint NOT NULL,
	"working_with_youngsters" smallint NOT NULL,
	"negotiating" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manager_attributes" ADD CONSTRAINT "manager_attributes_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attributes" ADD CONSTRAINT "staff_attributes_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;