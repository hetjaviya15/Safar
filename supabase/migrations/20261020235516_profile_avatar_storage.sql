-- Private profile images: account-scoped paths, signed reads, no public bucket.
-- Uploads use unique filenames (not upsert), so UPDATE is intentionally absent.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('safar-avatars','safar-avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy "safar avatar own read" on storage.objects for select to authenticated
using (bucket_id='safar-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "safar avatar own upload" on storage.objects for insert to authenticated
with check (bucket_id='safar-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "safar avatar own delete" on storage.objects for delete to authenticated
using (bucket_id='safar-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
