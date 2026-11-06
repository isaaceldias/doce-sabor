create table if not exists public.menu (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  price numeric(10,2) not null check (price >= 0), image text, active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), customer_name text not null, customer_phone text not null,
  items jsonb not null, total numeric(10,2) not null check (total >= 0), delivery_option text,
  payment_option text, status text not null default 'Pendente', created_at timestamptz not null default now()
);
alter table public.orders add column if not exists delivered_at timestamptz;

alter table public.menu enable row level security;
alter table public.orders enable row level security;
drop policy if exists "menu público para leitura" on public.menu;
drop policy if exists "pedidos públicos para criação" on public.orders;
drop policy if exists "menu demo para gerenciamento" on public.menu;
drop policy if exists "pedidos demo para gerenciamento" on public.orders;
create policy "menu público para leitura" on public.menu for select using (active = true);
create policy "pedidos públicos para criação" on public.orders for insert with check (true);
-- Demo: permite que o painel simples do protótipo gerencie os dados.
-- Antes de publicar, remova estas duas políticas e use Supabase Auth + RLS por usuário.
create policy "menu demo para gerenciamento" on public.menu for all using (true) with check (true);
create policy "pedidos demo para gerenciamento" on public.orders for all using (true) with check (true);

-- Storage das imagens do cardápio
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "imagens públicas para leitura" on storage.objects;
drop policy if exists "imagens demo para upload" on storage.objects;
create policy "imagens públicas para leitura" on storage.objects
for select using (bucket_id = 'product-images');

create policy "imagens demo para upload" on storage.objects
for insert with check (bucket_id = 'product-images');
