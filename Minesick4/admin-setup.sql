-- Zuerst Supabase Authentication → Users → Add user → Create new user.
-- E-Mail: admin@chunk-atlas.invalid (wie config.js), eigenes festes Passwort setzen,
-- Auto Confirm aktivieren. Dann diesen Block im SQL Editor ausführen.
do $$
declare admin_id uuid;
begin
 select id into admin_id from auth.users where lower(email)='admin@chunk-atlas.invalid';
 if admin_id is null then raise exception 'Bitte zuerst das Admin-Konto im Auth-Dashboard erstellen.'; end if;
 insert into public.atlas_admins(world_id,user_id) values('main',admin_id) on conflict do nothing;
end $$;
-- Website-Login: Name totalhs + das im Dashboard gesetzte feste Passwort.
-- Das Passwort niemals in JavaScript, SQL-Dateien oder auf GitHub speichern.
