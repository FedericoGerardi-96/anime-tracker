begin;

-- Additive metadata only: preserve displayed titles, identities, RLS and personal data.
alter table public.media
  add column if not exists title_english text,
  add column if not exists title_romaji text;

comment on column public.media.title_english is 'Official English title when available; title remains the displayed name.';
comment on column public.media.title_romaji is 'Romanized original title, used alongside title and title_english in library searches.';

notify pgrst, 'reload schema';
commit;
