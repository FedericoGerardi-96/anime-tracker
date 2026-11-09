begin;

-- Use the default (disabled) bucket versioning so upserts discard old contents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anitrack-profile-images', 'anitrack-profile-images', true, 245760, array['image/webp']);

-- Public asset URLs are served by Storage. Only the authorized AniTrack server
-- can write to this bucket or enumerate its objects through the Storage API.
create policy anitrack_profile_images_server_only
  on storage.objects as restrictive for all to anon, authenticated
  using (bucket_id <> 'anitrack-profile-images')
  with check (bucket_id <> 'anitrack-profile-images');

-- Storage owns the version. Replacing an object is the only write, so the
-- displayed revision cannot get out of sync with a separate profile update.
create function public.get_profile_image_versions(profile_ids uuid[])
returns table (profile_id uuid, kind text, revision text)
language sql stable security definer set search_path = '' as $$
  select requested.id, slot.kind, coalesce(object.version, object.updated_at::text)
  from (select distinct unnest(profile_ids[1:25]) as id) requested
  cross join (values ('avatar'), ('cover')) as slot(kind)
  join storage.objects object on object.bucket_id = 'anitrack-profile-images'
    and object.name = requested.id::text || '/' || slot.kind || '.webp';
$$;

revoke all on function public.get_profile_image_versions(uuid[]) from public, anon, authenticated;
grant execute on function public.get_profile_image_versions(uuid[]) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
