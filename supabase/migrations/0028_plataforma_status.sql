-- ==============================================================
-- BRYM · Migration 0028 — Mudar status do negócio pelo painel da plataforma
-- Aplicar depois da 0027, no SQL Editor.
--
-- Ponte manual até o Stripe: o admin da plataforma muda
-- `tenants.status_assinatura` pelo /admin. `suspenso`/`cancelado` bloqueiam o
-- acesso do negócio (checagem em `requireApp`, no app).
-- ==============================================================

create or replace function public.plataforma_set_status(
  p_tenant_id uuid,
  p_status    text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_plataforma_admin() then
    raise exception 'Sem permissão para o painel da plataforma.' using errcode = '42501';
  end if;

  if p_status not in ('trial', 'ativo', 'suspenso', 'cancelado') then
    raise exception 'Status inválido: %', p_status using errcode = '22023';
  end if;

  update public.tenants
  set status_assinatura = p_status
  where id = p_tenant_id;

  if not found then
    raise exception 'Negócio não encontrado.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.plataforma_set_status(uuid, text) from public;
grant execute on function public.plataforma_set_status(uuid, text) to authenticated;
