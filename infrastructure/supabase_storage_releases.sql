-- Atent: distribución pública de APKs Android.
-- Ejecutar en el SQL Editor del proyecto Supabase una sola vez.
-- La escritura permanece restringida al dashboard/service role; la lectura
-- pública solo permite descargar el archivo de distribución.

insert into storage.buckets (id, name, public)
values ('app-releases', 'app-releases', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read Atent releases" on storage.objects;
create policy "Public can read Atent releases"
on storage.objects for select
to public
using (bucket_id = 'app-releases');
