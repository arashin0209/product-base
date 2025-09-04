CREATE TABLE "plans" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"stripe_price_id" varchar(255),
	"active" boolean DEFAULT true,
	"features" jsonb DEFAULT '{}'::jsonb,
	"limits" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
