import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizar } from "@/lib/parsers/comunes";

// Traducir "lo que dice la planilla" a un local de la base.
//
// En Papanato alcanzaba con el nombre del local. Acá no: "Nueva Córdoba"
// existe en Censurado y en Formaggio, así que toda búsqueda por texto va
// SIEMPRE dentro de una marca. Por place_id sí es directo, porque una ficha
// de Google pertenece a un solo local.
//
// Los textos se comparan normalizados (sin acentos, sin dobles espacios,
// en minúscula): las planillas escriben "Nueva Cordoba" y "Nueva Córdoba"
// indistintamente.

type FilaLocal = {
  id: string;
  slug: string;
  google_place_id: string | null;
  ms_form_label: string | null;
  audit_sheet_label: string | null;
  brands: { slug: string } | { slug: string }[] | null;
};

export type Directorio = {
  /** place_id de Google → id del local. */
  porPlaceId: Map<string, string>;
  /** "marca|texto normalizado del formulario de MS" → id del local. */
  porFormularioMS: Map<string, string>;
  /** "marca|texto normalizado del campo LOCAL de la auditoría" → id del local. */
  porAuditoria: Map<string, string>;
  total: number;
};

const clave = (marca: string, texto: string) => `${marca}|${normalizar(texto)}`;

/** Carga las equivalencias una sola vez por corrida. */
export async function cargarDirectorio(
  supabase: SupabaseClient,
): Promise<Directorio> {
  const { data, error } = await supabase
    .from("locations")
    .select("id, slug, google_place_id, ms_form_label, audit_sheet_label, brands(slug)");
  if (error) throw new Error(`No se pudo leer locations: ${error.message}`);

  const dir: Directorio = {
    porPlaceId: new Map(),
    porFormularioMS: new Map(),
    porAuditoria: new Map(),
    total: (data ?? []).length,
  };

  for (const l of (data ?? []) as FilaLocal[]) {
    const marca = Array.isArray(l.brands) ? l.brands[0]?.slug : l.brands?.slug;
    if (l.google_place_id) dir.porPlaceId.set(l.google_place_id, l.id);
    if (!marca) continue;
    if (l.ms_form_label) dir.porFormularioMS.set(clave(marca, l.ms_form_label), l.id);
    if (l.audit_sheet_label) dir.porAuditoria.set(clave(marca, l.audit_sheet_label), l.id);
  }
  return dir;
}

export function localPorFormularioMS(
  dir: Directorio,
  marca: string,
  texto: string,
): string | undefined {
  return dir.porFormularioMS.get(clave(marca, texto));
}

export function localPorAuditoria(
  dir: Directorio,
  marca: string,
  texto: string,
): string | undefined {
  return dir.porAuditoria.get(clave(marca, texto));
}
