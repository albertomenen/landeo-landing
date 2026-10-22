alter table public.jobs
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_precision text,
  add column if not exists location_geocoded_at timestamptz,
  add column if not exists last_seen_at timestamptz;

alter table public.jobs
  drop constraint if exists jobs_latitude_range,
  add constraint jobs_latitude_range
    check (latitude is null or latitude between -90 and 90),
  drop constraint if exists jobs_longitude_range,
  add constraint jobs_longitude_range
    check (longitude is null or longitude between -180 and 180),
  drop constraint if exists jobs_location_precision_values,
  add constraint jobs_location_precision_values
    check (location_precision is null or location_precision in ('city', 'region', 'country'));

create index if not exists jobs_active_market_country_idx
  on public.jobs ((metadata ->> 'market_country'), status)
  where status = 'active';

create index if not exists jobs_active_coordinates_idx
  on public.jobs (latitude, longitude)
  where status = 'active' and latitude is not null and longitude is not null;
