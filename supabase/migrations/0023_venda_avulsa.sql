-- ==============================================================
-- BRYM · Migration 0023 — Venda avulsa (comanda sem agendamento)
-- Ajuste pós-Fase 4. Aplicar depois da 0022, no SQL Editor.
--
-- Regra da Fase 2b: toda comanda nasce de um agendamento (Agenda = fonte
-- única dos atendimentos). Exceção pontual: venda de balcão de PRODUTO, sem
-- hora marcada, sem cliente/profissional obrigatórios. `appointment_id` de
-- `comandas` vira opcional; um trigger garante que comanda sem agendamento
-- só aceita item de produto. `fechar_comanda`/`reabrir_comanda`/o trigger de
-- exclusão já fazem `where id = <appointment_id>` — com valor nulo isso é um
-- UPDATE que não acha linha (no-op seguro), nada mais precisa mudar neles.
-- ==============================================================

-- 1. appointment_id opcional (a constraint UNIQUE continua — Postgres permite
--    vários NULL numa coluna unique, então várias vendas avulsas não colidem).
alter table public.comandas
  alter column appointment_id drop not null;

-- 2. Trava no banco: comanda sem agendamento só aceita item de produto.
create or replace function public.comanda_items_valida_avulsa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo <> 'produto' and exists (
    select 1 from public.comandas c
    where c.id = new.comanda_id and c.appointment_id is null
  ) then
    raise exception 'Venda avulsa só aceita itens de produto.'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists comanda_items_valida_avulsa on public.comanda_items;
create trigger comanda_items_valida_avulsa
  before insert on public.comanda_items
  for each row execute function public.comanda_items_valida_avulsa();

-- 3. RPC pra abrir a venda avulsa (mesmo espírito de abrir_comanda).
create or replace function public.abrir_venda_avulsa()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comanda uuid;
begin
  if not public.has_section('financeiro') then
    raise exception 'Sem permissão para abrir uma venda.' using errcode = '42501';
  end if;

  insert into public.comandas (tenant_id, appointment_id, client_id, professional_id)
  values (public.current_tenant_id(), null, null, null)
  returning id into v_comanda;

  return v_comanda;
end;
$$;

revoke all on function public.abrir_venda_avulsa() from public;
grant execute on function public.abrir_venda_avulsa() to authenticated;
