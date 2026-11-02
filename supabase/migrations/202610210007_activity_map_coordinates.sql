-- Optional coordinates selected by the user. Existing itinerary data is retained.
alter table public.activities add column if not exists latitude double precision;
alter table public.activities add column if not exists longitude double precision;
alter table public.activities add constraint activities_valid_coordinates
  check ((latitude is null and longitude is null) or
    (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180));
