-- ==============================================================
-- BRYM · Migration 0007 — Corrige o grant de UPDATE em profiles
--
-- A 0006 usou `revoke update (col) ...`, que NÃO tem efeito quando o papel
-- já tem UPDATE no nível da tabela (padrão do Supabase). Resultado: um
-- funcionário ainda conseguia `update profiles set permissoes = [...]` e se
-- auto-promover. Aqui removemos o UPDATE da tabela inteira e devolvemos só
-- as colunas seguras.
--
-- Aplicar depois da 0006, no SQL Editor.
-- ==============================================================

revoke update on public.profiles from anon, authenticated;

grant update (nome, telefone) on public.profiles to authenticated;

-- `permissoes`, `papel`, `tenant_id`, `ativo` só mudam via funções
-- SECURITY DEFINER: handle_new_user, create_tenant_for_current_user,
-- accept_invitation, set_employee_permissions.
