CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"code" varchar(3) NOT NULL,
	"name_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "countries_key_unique" UNIQUE("key"),
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
