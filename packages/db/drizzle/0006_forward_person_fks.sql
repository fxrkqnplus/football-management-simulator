ALTER TABLE "clubs" ADD COLUMN "chairman_person_id" integer;--> statement-breakpoint
ALTER TABLE "federations" ADD COLUMN "president_person_id" integer;--> statement-breakpoint
ALTER TABLE "referees" ADD COLUMN "person_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_chairman_person_id_people_id_fk" FOREIGN KEY ("chairman_person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federations" ADD CONSTRAINT "federations_president_person_id_people_id_fk" FOREIGN KEY ("president_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referees" ADD CONSTRAINT "referees_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE restrict ON UPDATE no action;