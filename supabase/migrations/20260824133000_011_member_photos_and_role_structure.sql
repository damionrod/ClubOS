-- ClubOS v5: member photo storage + role structure hardening
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-photos','member-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "member_photos_public_read" on storage.objects;
create policy "member_photos_public_read" on storage.objects for select using (bucket_id='member-photos');

drop policy if exists "member_photos_org_upload" on storage.objects;
create policy "member_photos_org_upload" on storage.objects for insert to authenticated
with check (bucket_id='member-photos' and user_in_org((storage.foldername(name))[1]::uuid));

drop policy if exists "member_photos_org_update" on storage.objects;
create policy "member_photos_org_update" on storage.objects for update to authenticated
using (bucket_id='member-photos' and user_in_org((storage.foldername(name))[1]::uuid))
with check (bucket_id='member-photos' and user_in_org((storage.foldername(name))[1]::uuid));

drop policy if exists "member_photos_org_delete" on storage.objects;
create policy "member_photos_org_delete" on storage.objects for delete to authenticated
using (bucket_id='member-photos' and user_in_org((storage.foldername(name))[1]::uuid));

-- Additional structure metadata allows clubs to present roles in organisational order.
alter table roles add column if not exists reports_to_role_id uuid references roles(id) on delete set null;
alter table roles add column if not exists structure_group text default 'Administration';
alter table roles add column if not exists is_archived boolean not null default false;
