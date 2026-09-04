-- snapshot del acumulado por local
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:32.716Z', 151, 4.5
from public.locations l where l.google_place_id = 'ChIJU-UsAJ2ZMpQRK_lndZC8jOQ'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:32.773Z', 116, 4.7
from public.locations l where l.google_place_id = 'ChIJE1hOo9ijMpQRcAZkNHay_CI'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:36.449Z', 34, 4.9
from public.locations l where l.google_place_id = 'ChIJy2X1ByqdMpQRY3o942jJi3o'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:39.922Z', 139, 4.2
from public.locations l where l.google_place_id = 'ChIJ-VIhviCjMpQRdsd1qDkDq_M'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:38.159Z', 173, 4.3
from public.locations l where l.google_place_id = 'ChIJBckoomijMpQRzLCSWoM5XcQ'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:42.392Z', 163, 4.5
from public.locations l where l.google_place_id = 'ChIJa2cWiXmZMpQRcItMChl0WEs'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:43.394Z', 245, 4.6
from public.locations l where l.google_place_id = 'ChIJsydZIZufMpQR15UFXpetqr0'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:48.439Z', 99, 4.3
from public.locations l where l.google_place_id = 'ChIJNRr3ox9nLZQRNU3Neh4PaYA'
on conflict (location_id, scraped_on) do nothing;
insert into public.review_snapshots (location_id, scraped_on, scraped_at, reviews_count, total_score)
select l.id, '2026-09-01', '2026-09-01T04:51:44.843Z', 13, 5
from public.locations l where l.google_place_id = 'ChIJhyvxXv-ZMpQRxWijKRAWC_c'
on conflict (location_id, scraped_on) do nothing;
-- mystery shopper formaggio
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-27T12:00:15.693Z', '2026-08-26', 'Denise Lagos', 'take_away',
       73, 73, 100, 'Regular',
       '{"% Sec.3":100,"% Sec.4":63.33,"% Sec.5":72,"% Sec.6":60}'::jsonb, false, 'sheets:ms-formaggio', 'formaggio|nueva cordoba|2026-08-27T12:00:15.693Z|take_away'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'formaggio' and lower(l.ms_form_label) = lower('Nueva Cordoba')
on conflict (source_row_hash) do nothing;
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-31T13:16:32.967Z', '2026-08-28', 'Micaela turri', 'take_away',
       96.84, 92, 95, 'Excelente',
       '{"% Sec.3":100,"% Sec.4":90,"% Sec.5":100,"% Sec.6":100}'::jsonb, false, 'sheets:ms-formaggio', 'formaggio|tejeda|2026-08-31T13:16:32.967Z|take_away'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'formaggio' and lower(l.ms_form_label) = lower('Tejeda')
on conflict (source_row_hash) do nothing;
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-31T23:47:37.177Z', '2026-08-30', 'Julieta Camilletti', 'take_away',
       65.26, 62, 95, 'Regular',
       '{"% Sec.3":33.33,"% Sec.4":56.67,"% Sec.5":77.78,"% Sec.6":100}'::jsonb, false, 'sheets:ms-formaggio', 'formaggio|villa allende|2026-08-31T23:47:37.177Z|take_away'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'formaggio' and lower(l.ms_form_label) = lower('Villa Allende')
on conflict (source_row_hash) do nothing;
-- mystery shopper censurado
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-25T22:58:01.567Z', '2026-08-25', 'Denise Lagos', 'take_away',
       72, 72, 100, 'Regular',
       '{"[TA] %Sec3":75,"[TA] %Sec4":50,"[TA] %Sec5":86.67,"[TA] %Sec6":60}'::jsonb, false, 'sheets:ms-censurado', 'censurado|general paz|2026-08-25T22:58:01.567Z|take_away'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.ms_form_label) = lower('General Paz')
on conflict (source_row_hash) do nothing;
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-27T23:28:23.933Z', '2026-08-27', 'Zahira', 'delivery',
       69.41, 59, 85, 'Regular',
       '{"[DE] %Sec3":0,"[DE] %Sec4":53.33,"[DE] %Sec5":95,"[DE] %Sec6":100}'::jsonb, true, 'sheets:ms-censurado', 'censurado|nueva cordoba|2026-08-27T23:28:23.933Z|delivery'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.ms_form_label) = lower('Nueva Córdoba')
on conflict (source_row_hash) do nothing;
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-30T23:36:44.977Z', '2026-08-30', 'Milagros Pereyra', 'take_away',
       89.47, 85, 95, 'Bueno',
       '{"[TA] %Sec3":33.33,"[TA] %Sec4":100,"[TA] %Sec5":100,"[TA] %Sec6":100}'::jsonb, false, 'sheets:ms-censurado', 'censurado|carlos paz|2026-08-30T23:36:44.977Z|take_away'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.ms_form_label) = lower('Carlos Paz')
on conflict (source_row_hash) do nothing;
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-31T00:58:19.185Z', '2026-08-31', 'Alvaro', 'take_away',
       74, 74, 100, 'Regular',
       '{"[TA] %Sec3":50,"[TA] %Sec4":100,"[TA] %Sec5":68.89,"[TA] %Sec6":60}'::jsonb, false, 'sheets:ms-censurado', 'censurado|recta|2026-08-31T00:58:19.185Z|take_away'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.ms_form_label) = lower('Recta')
on conflict (source_row_hash) do nothing;
insert into public.mystery_shopper_visits
  (location_id, form_timestamp, visit_date, evaluator, experience_type,
   score_pct, points_obtained, points_max, classification, sections, needs_review, source, source_row_hash)
select l.id, '2026-08-31T13:22:06.248Z', '2026-08-31', 'Micaela', 'take_away',
       100, 100, 100, 'Excelente',
       '{"[TA] %Sec3":100,"[TA] %Sec4":100,"[TA] %Sec5":100,"[TA] %Sec6":100}'::jsonb, false, 'sheets:ms-censurado', 'censurado|urca|2026-08-31T13:22:06.248Z|take_away'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.ms_form_label) = lower('Urca')
on conflict (source_row_hash) do nothing;
-- auditorías presenciales (solo Censurado)
insert into public.audits
  (location_id, audit_date, auditor, franchisee, score_pct, source_sheet, source_row_hash)
select l.id, '2026-08-09', 'Julieta', 'Gastón Gil', 75.23, 'Nueva Cba', 'auditoria|nueva cordoba|2026-08-09'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.audit_sheet_label) = lower('Nueva Cordoba')
on conflict (source_row_hash) do nothing;
insert into public.audits
  (location_id, audit_date, auditor, franchisee, score_pct, source_sheet, source_row_hash)
select l.id, '2026-08-21', null, null, 67.17, 'Gral Paz', 'auditoria|general paz|2026-08-21'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.audit_sheet_label) = lower('GENERAL PAZ')
on conflict (source_row_hash) do nothing;
insert into public.audits
  (location_id, audit_date, auditor, franchisee, score_pct, source_sheet, source_row_hash)
select l.id, '2026-08-22', null, null, 75.56, 'Urca', 'auditoria|urca|2026-08-22'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.audit_sheet_label) = lower('URCA')
on conflict (source_row_hash) do nothing;
insert into public.audits
  (location_id, audit_date, auditor, franchisee, score_pct, source_sheet, source_row_hash)
select l.id, '2026-08-23', null, null, 85.81, 'Carlos Paz', 'auditoria|carlos paz|2026-08-23'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.audit_sheet_label) = lower('Carlos Paz')
on conflict (source_row_hash) do nothing;
insert into public.audits
  (location_id, audit_date, auditor, franchisee, score_pct, source_sheet, source_row_hash)
select l.id, '2026-08-29', null, null, 72.57, 'Recta', 'auditoria|recta|2026-08-29'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.audit_sheet_label) = lower('Recta')
on conflict (source_row_hash) do nothing;
insert into public.audits
  (location_id, audit_date, auditor, franchisee, score_pct, source_sheet, source_row_hash)
select l.id, '2026-08-28', null, null, 85.46, 'Check Luuma', 'auditoria|luuma|2026-08-28'
from public.locations l join public.brands b on b.id = l.brand_id
where b.slug = 'censurado' and lower(l.audit_sheet_label) = lower('Luuma')
on conflict (source_row_hash) do nothing;
