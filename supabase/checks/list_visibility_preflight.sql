-- Read-only metadata audit before applying 202611070001_list_visibility.sql.
-- Run in the Supabase SQL Editor. Keep the output for review.
-- REST/OpenAPI confirms columns but cannot prove policies or function bodies.

select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name in ('lists', 'list_media', 'media')
order by table_name, ordinal_position;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public' and tablename in ('lists', 'list_media')
order by tablename, policyname;

select c.relname, c.relrowsecurity, c.relforcerowsecurity,
  pg_catalog.pg_get_userbyid(c.relowner) as owner
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('lists', 'list_media');

select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public' and table_name in ('lists', 'list_media')
order by table_name, grantee, privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name in ('lists', 'list_media')
order by table_name, column_name, grantee;

-- Definer functions and owner-executed views can bypass ordinary table RLS.
-- Inspect caller authorization, auth.uid() filters and explicit public projections.
select n.nspname as schema_name, p.proname, p.prosecdef,
  pg_catalog.pg_get_userbyid(p.proowner) as owner, p.proacl,
  pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and (p.proname ilike '%list%' or p.prosrc ~* '\m(lists|list_media)\M')
order by p.proname;

select schemaname, viewname, viewowner, definition
from pg_catalog.pg_views
where schemaname = 'public' and definition ~* '\m(lists|list_media)\M';

select t.tgname, c.relname, pg_catalog.pg_get_triggerdef(t.oid) as definition
from pg_catalog.pg_trigger t join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('lists', 'list_media') and not t.tgisinternal;
