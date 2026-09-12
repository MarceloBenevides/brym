create or replace function public.plataforma_estender_trial(
  p_tenant_id uuid,
  p_dias      integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base timestamptz;
begin
  if not public.is_plataforma_admin() then
    raise exception 'Sem permissao para o painel da plataforma.' using errcode = '42501';
  end if;

  if p_dias not in (7, 15, 30) then
    raise exception 'Quantidade de dias invalida: %', p_dias using errcode = '22023';
  end if;

  select greatest(trial_expira_em, now()) into v_base
  from public.tenants
  where id = p_tenant_id;

  if not found then
    raise exception 'Negocio nao encontrado.' using errcode = '22023';
  end if;

  update public.tenants
  set trial_expira_em = v_base + (p_dias || ' days')::interval
  where id = p_tenant_id;
end;
$$;

revoke all on function public.plataforma_estender_trial(uuid, integer) from public;
grant execute on function public.plataforma_estender_trial(uuid, integer) to authenticated;

create or replace function public.plataforma_ativar_manual(
  p_tenant_id uuid,
  p_meses     integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_plataforma_admin() then
    raise exception 'Sem permissao para o painel da plataforma.' using errcode = '42501';
  end if;

  if p_meses not in (3, 6, 12) then
    raise exception 'Periodo invalido: %', p_meses using errcode = '22023';
  end if;

  update public.tenants
  set status_assinatura = 'ativo',
      assinatura_ativa_ate = now() + (p_meses || ' months')::interval,
      assinatura_em_atraso = false
  where id = p_tenant_id;

  if not found then
    raise exception 'Negocio nao encontrado.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.plataforma_ativar_manual(uuid, integer) from public;
grant execute on function public.plataforma_ativar_manual(uuid, integer) to authenticated;
