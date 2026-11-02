-- Only new accounts; never rewrite an existing preference or trip currency.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name,preferred_currency,preferred_language)
  values(new.id,new.raw_user_meta_data->>'full_name',
    case when new.raw_user_meta_data->>'preferred_currency' ~ '^[A-Z]{3}$'
      then new.raw_user_meta_data->>'preferred_currency' else 'INR' end,
    coalesce(nullif(new.raw_user_meta_data->>'preferred_language',''),'en'))
  on conflict(id) do nothing;
  return new;
end $$;
