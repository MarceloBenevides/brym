drop policy if exists "logos-negocios: dono gerencia" on storage.objects;
create policy "logos-negocios: dono gerencia"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'logos-negocios'
    and name = public.current_tenant_id()::text
    and public.is_owner()
  )
  with check (
    bucket_id = 'logos-negocios'
    and name = public.current_tenant_id()::text
    and public.is_owner()
  );
