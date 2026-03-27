drop extension if exists "pg_net";

create sequence "public"."_migrations_id_seq";


  create table "public"."_migrations" (
    "id" integer not null default nextval('public._migrations_id_seq'::regclass),
    "name" character varying(255) not null,
    "executed_at" timestamp without time zone default CURRENT_TIMESTAMP
      );


alter sequence "public"."_migrations_id_seq" owned by "public"."_migrations"."id";

CREATE UNIQUE INDEX _migrations_name_key ON public._migrations USING btree (name);

CREATE UNIQUE INDEX _migrations_pkey ON public._migrations USING btree (id);

alter table "public"."_migrations" add constraint "_migrations_pkey" PRIMARY KEY using index "_migrations_pkey";

alter table "public"."_migrations" add constraint "_migrations_name_key" UNIQUE using index "_migrations_name_key";

grant delete on table "public"."_migrations" to "anon";

grant insert on table "public"."_migrations" to "anon";

grant references on table "public"."_migrations" to "anon";

grant select on table "public"."_migrations" to "anon";

grant trigger on table "public"."_migrations" to "anon";

grant truncate on table "public"."_migrations" to "anon";

grant update on table "public"."_migrations" to "anon";

grant delete on table "public"."_migrations" to "authenticated";

grant insert on table "public"."_migrations" to "authenticated";

grant references on table "public"."_migrations" to "authenticated";

grant select on table "public"."_migrations" to "authenticated";

grant trigger on table "public"."_migrations" to "authenticated";

grant truncate on table "public"."_migrations" to "authenticated";

grant update on table "public"."_migrations" to "authenticated";

grant delete on table "public"."_migrations" to "service_role";

grant insert on table "public"."_migrations" to "service_role";

grant references on table "public"."_migrations" to "service_role";

grant select on table "public"."_migrations" to "service_role";

grant trigger on table "public"."_migrations" to "service_role";

grant truncate on table "public"."_migrations" to "service_role";

grant update on table "public"."_migrations" to "service_role";


