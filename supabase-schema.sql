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

alter table public.menu enable row level security;
alter table public.orders enable row level security;
create policy "menu público para leitura" on public.menu for select using (active = true);
create policy "pedidos públicos para criação" on public.orders for insert with check (true);
-- Demo: permite que o painel simples do protótipo gerencie os dados.
-- Antes de publicar, remova estas duas políticas e use Supabase Auth + RLS por usuário.
create policy "menu demo para gerenciamento" on public.menu for all using (true) with check (true);
create policy "pedidos demo para gerenciamento" on public.orders for all using (true) with check (true);
