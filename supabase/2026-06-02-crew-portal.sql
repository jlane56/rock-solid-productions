create table if not exists public.crew_profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  full_name text not null,
  default_role text not null default 'Crew',
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.production_gigs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  service_type text not null default 'Live Production',
  venue_name text not null,
  venue_address text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  crew_call_label text not null,
  doors_label text not null,
  show_start_label text not null,
  strike_label text not null,
  production_note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.crew_assignments (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.production_gigs(id) on delete cascade,
  crew_profile_id uuid not null references public.crew_profiles(id) on delete cascade,
  role text not null,
  details text not null default '',
  created_at timestamptz not null default now(),
  unique (gig_id, crew_profile_id)
);

create table if not exists public.gig_timeline_items (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.production_gigs(id) on delete cascade,
  sort_order integer not null default 0,
  time_label text not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gig_documents (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.production_gigs(id) on delete cascade,
  label text not null,
  kind text not null default 'File',
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gig_contacts (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.production_gigs(id) on delete cascade,
  name text not null,
  role text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.crew_profiles enable row level security;
alter table public.production_gigs enable row level security;
alter table public.crew_assignments enable row level security;
alter table public.gig_timeline_items enable row level security;
alter table public.gig_documents enable row level security;
alter table public.gig_contacts enable row level security;

create index if not exists crew_profiles_clerk_user_id_idx on public.crew_profiles(clerk_user_id);
create index if not exists crew_assignments_profile_idx on public.crew_assignments(crew_profile_id);
create index if not exists crew_assignments_gig_idx on public.crew_assignments(gig_id);
create index if not exists gig_timeline_items_gig_idx on public.gig_timeline_items(gig_id);
create index if not exists gig_documents_gig_idx on public.gig_documents(gig_id);
create index if not exists gig_contacts_gig_idx on public.gig_contacts(gig_id);
