CREATE TABLE "player_positions" (
	"player_id" integer NOT NULL,
	"position" text NOT NULL,
	"level" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_positions_player_id_position_pk" PRIMARY KEY("player_id","position"),
	CONSTRAINT "player_positions_position_check" CHECK ("player_positions"."position" IN ('GK', 'DC', 'DL', 'DR', 'DM', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR', 'ST')),
	CONSTRAINT "player_positions_level_check" CHECK ("player_positions"."level" IN ('natural', 'accomplished', 'competent', 'awkward', 'ineffectual'))
);
--> statement-breakpoint
CREATE TABLE "player_stats_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"season_year" integer NOT NULL,
	"competition_id" integer NOT NULL,
	"club_id" integer,
	"appearances" integer NOT NULL,
	"minutes" integer NOT NULL,
	"goals" integer NOT NULL,
	"assists" integer NOT NULL,
	"xg" numeric(6, 2) NOT NULL,
	"xa" numeric(6, 2) NOT NULL,
	"passes_attempted" integer NOT NULL,
	"passes_completed" integer NOT NULL,
	"progressive_passes" integer NOT NULL,
	"dribbles_attempted" integer NOT NULL,
	"dribbles_completed" integer NOT NULL,
	"duels_won" integer NOT NULL,
	"duels_total" integer NOT NULL,
	"aerials_won" integer NOT NULL,
	"aerials_total" integer NOT NULL,
	"tackles" integer NOT NULL,
	"interceptions" integer NOT NULL,
	"blocks" integer NOT NULL,
	"fouls_committed" integer NOT NULL,
	"yellow_cards" integer NOT NULL,
	"red_cards" integer NOT NULL,
	"saves" integer NOT NULL,
	"goals_conceded" integer NOT NULL,
	"xga" numeric(6, 2) NOT NULL,
	"clean_sheets" integer NOT NULL,
	"penalties_saved" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_traits" (
	"player_id" integer NOT NULL,
	"trait_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_traits_player_id_trait_code_pk" PRIMARY KEY("player_id","trait_code")
);
--> statement-breakpoint
ALTER TABLE "player_positions" ADD CONSTRAINT "player_positions_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats_history" ADD CONSTRAINT "player_stats_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats_history" ADD CONSTRAINT "player_stats_history_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats_history" ADD CONSTRAINT "player_stats_history_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_traits" ADD CONSTRAINT "player_traits_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;