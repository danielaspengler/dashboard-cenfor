-- Acceso de los tres dueños y socios de CENFOR (pedido de Daniela, 29/09/2026).
--
-- cenforgastro.com tiene el correo en Hostinger, no en Google: Tomás y
-- Benjamín entran solo si crearon una cuenta de Google con ese mismo mail
-- (accounts.google.com → «Usar mi dirección de correo electrónico actual»).
-- La comparación con la sesión es sin distinguir mayúsculas.

insert into public.emails_autorizados (email, nota)
select v.email, v.nota
from (values
  ('gastongilcenforgastro@gmail.com', 'Gastón Gil · dueño y socio de CENFOR'),
  ('tomashansen@cenforgastro.com', 'Tomás Hansen · dueño y socio de CENFOR'),
  ('benjaminhansen@cenforgastro.com', 'Benjamín Hansen · dueño y socio de CENFOR')
) as v(email, nota)
where not exists (
  select 1 from public.emails_autorizados a where lower(a.email) = lower(v.email)
);
