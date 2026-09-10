-- ==============================================================
-- BRYM · Migration 0005 — Agenda / Agendamentos
-- Fase 1b-iii. Aplicar depois da 0004, no SQL Editor.
-- ==============================================================

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  client_id       uuid not null references public.clients (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id      uuid references public.services (id) on delete set null,
  data            date not null,
  hora_inicio     time not null,
  hora_fim        time not null,
  status          text not null default 'confirmado'
                    check (status in ('confirmado','concluido','cancelado','nao_compareceu')),
  observacoes     text,
  criado_em       timestamptz not null default now(),
  check (hora_fim > hora_inicio)
);

create index if not exists appointments_tenant_data_idx on public.appointments (tenant_id, data);
create index if not exists appointments_prof_data_idx on public.appointments (professional_id, data);
create index if not exists appointments_client_idx on public.appointments (client_id);

-- --------------------------------------------------------------
-- Conflito de horário: mesmo profissional, mesma data, faixas que se cruzam
-- (agendamentos cancelados não contam)
-- --------------------------------------------------------------

create or replace function public.appointments_check_overlap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelado' then
    return new;
  end if;

  if exists (
    select 1 from public.appointments a
    where a.professional_id = new.professional_id
      and a.data = new.data
      and a.id <> new.id
      and a.status <> 'cancelado'
      and a.hora_inicio < new.hora_fim
      and a.hora_fim > new.hora_inicio
  ) then
    raise exception 'Esse profissional já tem um agendamento nesse horário.'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_no_overlap on public.appointments;
create trigger appointments_no_overlap
  before insert or update of professional_id, data, hora_inicio, hora_fim, status
  on public.appointments
  for each row execute function public.appointments_check_overlap();

-- --------------------------------------------------------------
-- RLS — qualquer membro do tenant gerencia a agenda
-- --------------------------------------------------------------

alter table public.appointments enable row level security;

drop policy if exists "appointments: do tenant" on public.appointments;
create policy "appointments: do tenant"
  on public.appointments for all
  to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
