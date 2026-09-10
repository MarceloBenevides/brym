-- ==============================================================
-- BRYM · Migration 0014 — RLS de tenant_settings (dono edita)
-- Fase 3a. Aplicar depois da 0013, no SQL Editor.
--
-- Antes: uma policy `for all` deixava qualquer membro editar as
-- preferências. Agora: qualquer membro LÊ (a Agenda depende do
-- intervalo), só o dono EDITA.
-- ==============================================================

drop policy if exists "tenant_settings: do tenant" on public.tenant_settings;
drop policy if exists "tenant_settings: ver do tenant" on public.tenant_settings;
create policy "tenant_settings: ver do tenant"
  on public.tenant_settings for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_settings: dono edita" on public.tenant_settings;
create policy "tenant_settings: dono edita"
  on public.tenant_settings for update
  to authenticated
  using (tenant_id = public.current_tenant_id() and public.is_owner())
  with check (tenant_id = public.current_tenant_id() and public.is_owner());

-- INSERT continua só via public.create_tenant_for_current_user (SECURITY DEFINER).
