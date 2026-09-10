-- BRYM . Migration 0030 - Ausencias de profissional (folga / falta / atraso)
-- Aplicar depois da 0029, no SQL Editor.
--
-- Uma ausencia bloqueia horarios so no link publico (agendar_disponibilidade
-- esconde, agendar_confirmar recusa). Na Agenda interna a grade so marca
-- visualmente - o dono ainda consegue agendar por cima. Por isso NAO ha
-- trigger novo em appointments: a checagem vive so no caminho publico.
--
-- Cadastro: so o dono (Equipe > Profissionais). O funcionario vinculado nao
-- marca a propria ausencia. SELECT liberado pra qualquer membro (a Agenda le).

create table if not exists public.ausencias (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  data            date not null,
  dia_todo        boolean not null default true,
  hora_inicio     time,
  hora_fim        time,
  motivo          text not null default 'folga'
                    check (motivo in ('folga', 'falta', 'atraso', 'outro')),
  observacoes     text,
  criado_por      uuid references public.profiles (id) on delete set null,
  criado_em       timestamptz not null default now(),
  check (
    dia_todo
    or (hora_inicio is not null and hora_fim is not null and hora_fim > hora_inicio)
  )
);

create index if not exists ausencias_prof_data_idx
  on public.ausencias (professional_id, data);
create index if not exists ausencias_tenant_data_idx
  on public.ausencias (tenant_id, data);

alter table public.ausencias enable row level security;

drop policy if exists "ausencias: ver do tenant" on public.ausencias;
create policy "ausencias: ver do tenant"
  on public.ausencias for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "ausencias: dono gerencia" on public.ausencias;
create policy "ausencias: dono gerencia"
  on public.ausencias for all
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_owner())
  with check (tenant_id = public.current_tenant_id() and public.is_owner());


-- agendar_disponibilidade: alem do horario do dia (0029), esconde ausencias
create or replace function public.agendar_disponibilidade(
  p_slug            text,
  p_professional_id uuid,
  p_data            date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_tenant_id uuid;
  v_ocupados  jsonb;
  v_ausencias jsonb;
  v_dia_todo  boolean;
  v_hj        jsonb;
  v_intervalo int;
  v_agora_min int := extract(hour from localtime)::int * 60 + extract(minute from localtime)::int;
begin
  select id into v_tenant_id from public.tenants where slug = p_slug;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  if not exists (
    select 1 from public.professionals
    where id = p_professional_id and tenant_id = v_tenant_id
      and ativo and mostrar_no_link_online
  ) then
    return jsonb_build_object('ok', false);
  end if;

  if p_data < current_date then
    return jsonb_build_object('ok', false);
  end if;

  select intervalo_agendamento_min,
         horario_funcionamento -> (extract(dow from p_data)::int::text)
    into v_intervalo, v_hj
  from public.tenant_settings
  where tenant_id = v_tenant_id;
  v_intervalo := coalesce(v_intervalo, 30);

  if v_hj is null or v_hj = 'null'::jsonb then
    return jsonb_build_object(
      'ok', true, 'fechado', true, 'intervalo_min', v_intervalo,
      'hoje', to_char(current_date, 'YYYY-MM-DD'),
      'agora_min', v_agora_min, 'ocupados', '[]'::jsonb
    );
  end if;

  select bool_or(dia_todo) into v_dia_todo
  from public.ausencias
  where professional_id = p_professional_id and data = p_data;

  if coalesce(v_dia_todo, false) then
    return jsonb_build_object(
      'ok', true, 'ausente_dia', true, 'intervalo_min', v_intervalo,
      'abre', v_hj ->> 'abre', 'fecha', v_hj ->> 'fecha',
      'hoje', to_char(current_date, 'YYYY-MM-DD'),
      'agora_min', v_agora_min, 'ocupados', '[]'::jsonb
    );
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'inicio', to_char(a.hora_inicio, 'HH24:MI'),
           'fim', to_char(a.hora_fim, 'HH24:MI')
         ) order by a.hora_inicio), '[]'::jsonb)
    into v_ocupados
  from public.appointments a
  where a.professional_id = p_professional_id
    and a.data = p_data
    and a.status <> 'cancelado';

  select coalesce(jsonb_agg(jsonb_build_object(
           'inicio', to_char(au.hora_inicio, 'HH24:MI'),
           'fim', to_char(au.hora_fim, 'HH24:MI')
         )), '[]'::jsonb)
    into v_ausencias
  from public.ausencias au
  where au.professional_id = p_professional_id
    and au.data = p_data
    and not au.dia_todo
    and au.hora_inicio is not null
    and au.hora_fim is not null;

  return jsonb_build_object(
    'ok', true,
    'intervalo_min', v_intervalo,
    'abre', v_hj ->> 'abre',
    'fecha', v_hj ->> 'fecha',
    'hoje', to_char(current_date, 'YYYY-MM-DD'),
    'agora_min', v_agora_min,
    'ocupados', v_ocupados || v_ausencias
  );
end;
$$;

revoke all on function public.agendar_disponibilidade(text, uuid, date) from public;
grant execute on function public.agendar_disponibilidade(text, uuid, date) to anon, authenticated;


-- agendar_confirmar: alem do horario do dia (0029), recusa horario em ausencia
create or replace function public.agendar_confirmar(
  p_slug     text,
  p_nome     text,
  p_telefone text,
  p_itens    jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set timezone = 'America/Sao_Paulo'
as $$
declare
  v_tenant_id    uuid;
  v_digits       text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_nome         text := btrim(coalesce(p_nome, ''));
  v_client_id    uuid;
  v_client_nome  text;
  v_qtd_futuros  int;
  v_item         jsonb;
  v_idx          int := -1;
  v_loop_idx     int;
  v_servico_id   uuid;
  v_duracao      int;
  v_prof_id      uuid;
  v_data         date;
  v_hora_inicio  time;
  v_hora_fim     time;
  v_hoje         date := current_date;
  v_agora_min    int;
  v_agendamentos jsonb := '[]'::jsonb;
  v_motivo       text;
  v_sqlstate     text;
  v_horarios     jsonb;
  v_hj           jsonb;
begin
  select id into v_tenant_id from public.tenants where slug = p_slug;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'negocio');
  end if;

  if v_nome = '' then
    return jsonb_build_object('ok', false, 'motivo', 'nome');
  end if;
  if length(v_digits) < 8 then
    return jsonb_build_object('ok', false, 'motivo', 'telefone');
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'carrinho_vazio');
  end if;
  if jsonb_array_length(p_itens) > 5 then
    return jsonb_build_object('ok', false, 'motivo', 'carrinho_grande');
  end if;

  v_agora_min := extract(hour from localtime)::int * 60 + extract(minute from localtime)::int;

  select horario_funcionamento into v_horarios
  from public.tenant_settings where tenant_id = v_tenant_id;

  begin
    select id, nome into v_client_id, v_client_nome
    from public.clients
    where tenant_id = v_tenant_id
      and ativo
      and right(regexp_replace(coalesce(telefone, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
    order by criado_em desc
    limit 1;

    if not found then
      insert into public.clients (tenant_id, nome, telefone)
      values (v_tenant_id, v_nome, p_telefone)
      returning id, nome into v_client_id, v_client_nome;
    end if;

    select count(*) into v_qtd_futuros
    from public.appointments
    where client_id = v_client_id
      and tenant_id = v_tenant_id
      and status = 'confirmado'
      and data >= v_hoje;
    if v_qtd_futuros >= 8 then
      raise exception 'limite' using errcode = 'P0001';
    end if;

    for v_loop_idx in 0 .. jsonb_array_length(p_itens) - 1 loop
      v_idx := v_loop_idx;
      v_item := p_itens -> v_idx;

      begin
        v_data := (v_item ->> 'data')::date;
        v_hora_inicio := (v_item ->> 'hora_inicio')::time;
        v_servico_id := nullif(v_item ->> 'servico_id', '')::uuid;
        v_prof_id := nullif(v_item ->> 'professional_id', '')::uuid;
      exception when others then
        raise exception 'item_invalido' using errcode = 'P0001';
      end;

      select duracao_min into v_duracao
      from public.services
      where id = v_servico_id and tenant_id = v_tenant_id and ativo;
      if not found then
        raise exception 'servico_invalido' using errcode = 'P0001';
      end if;

      if not exists (
        select 1 from public.professionals
        where id = v_prof_id and tenant_id = v_tenant_id and ativo and mostrar_no_link_online
      ) then
        raise exception 'profissional_invalido' using errcode = 'P0001';
      end if;

      if not exists (
        select 1 from public.professional_services
        where professional_id = v_prof_id and service_id = v_servico_id
      ) then
        raise exception 'vinculo_invalido' using errcode = 'P0001';
      end if;

      if v_data < v_hoje
         or (v_data = v_hoje
             and extract(hour from v_hora_inicio)::int * 60 + extract(minute from v_hora_inicio)::int < v_agora_min)
      then
        raise exception 'passado' using errcode = 'P0001';
      end if;

      v_hora_fim := v_hora_inicio + make_interval(mins => v_duracao);

      v_hj := v_horarios -> (extract(dow from v_data)::int::text);
      if v_hj is null or v_hj = 'null'::jsonb then
        raise exception 'fechado' using errcode = 'P0001';
      end if;
      if v_hora_inicio < (v_hj ->> 'abre')::time
         or v_hora_fim > (v_hj ->> 'fecha')::time then
        raise exception 'fora_do_horario' using errcode = 'P0001';
      end if;

      if exists (
        select 1 from public.ausencias au
        where au.professional_id = v_prof_id
          and au.data = v_data
          and (
            au.dia_todo
            or (au.hora_inicio < v_hora_fim and au.hora_fim > v_hora_inicio)
          )
      ) then
        raise exception 'ausente' using errcode = 'P0001';
      end if;

      insert into public.appointments
        (tenant_id, client_id, professional_id, service_id, data, hora_inicio, hora_fim, status)
      values
        (v_tenant_id, v_client_id, v_prof_id, v_servico_id, v_data, v_hora_inicio, v_hora_fim, 'confirmado');

      select v_agendamentos || jsonb_build_object(
        'servico_nome', s.nome,
        'profissional_nome', pr.nome,
        'data', to_char(v_data, 'YYYY-MM-DD'),
        'hora_inicio', to_char(v_hora_inicio, 'HH24:MI')
      ) into v_agendamentos
      from public.services s, public.professionals pr
      where s.id = v_servico_id and pr.id = v_prof_id;
    end loop;

  exception
    when others then
      get stacked diagnostics v_sqlstate = returned_sqlstate;
      if v_sqlstate = '23P01' then
        return jsonb_build_object('ok', false, 'motivo', 'ocupado', 'item_index', v_idx);
      end if;
      if v_sqlstate = 'P0001' then
        get stacked diagnostics v_motivo = message_text;
        return jsonb_build_object('ok', false, 'motivo', v_motivo, 'item_index', v_idx);
      end if;
      raise;
  end;

  return jsonb_build_object(
    'ok', true,
    'cliente_nome', v_client_nome,
    'agendamentos', v_agendamentos
  );
end;
$$;

revoke all on function public.agendar_confirmar(text, text, text, jsonb) from public;
grant execute on function public.agendar_confirmar(text, text, text, jsonb) to anon, authenticated;
