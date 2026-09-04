-- Postgres otorga EXECUTE a PUBLIC por defecto, así que las tres
-- funciones auxiliares quedaron llamables sin sesión vía /rest/v1/rpc.
-- Se revoca a todos y se concede solo a `authenticated`: las policies
-- de RLS se evalúan con el rol de quien consulta, así que ese rol SÍ
-- necesita poder ejecutarlas.
--
-- Papanato pasó por lo mismo (migraciones revocar_execute_es_direccion
-- y grant_execute_es_direccion_authenticated, jul 2026).

revoke execute on function public.es_direccion()      from public, anon;
revoke execute on function public.ve_area(text)       from public, anon;
revoke execute on function public.ve_marca(uuid)      from public, anon;

grant execute on function public.es_direccion()  to authenticated;
grant execute on function public.ve_area(text)   to authenticated;
grant execute on function public.ve_marca(uuid)  to authenticated;
