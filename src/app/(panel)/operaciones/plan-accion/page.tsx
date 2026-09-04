import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

// El lugar está reservado; el contenido se define con CENFOR.
//
// La pantalla dice en voz alta lo que falta decidir en vez de mostrar una
// maqueta con datos inventados. Una tabla de ejemplo con tareas falsas se
// confunde con la real y después hay que explicar que nada de eso existe.

export default function PlanAccionPage() {
  return (
    <>
      <PageHeader
        titulo="Plan de acción"
        bajada="Sección reservada · el contenido se define con el cliente"
      />

      <div className="p-7">
        <div className="max-w-2xl rounded-xl border border-dashed border-[var(--color-borde)] bg-white p-7">
          <h2 className="text-sm font-medium">Qué va a ir acá</h2>
          <p className="mt-2 text-sm text-[var(--color-piedra)]">
            El seguimiento de lo que hay que corregir en cada local: de dónde sale el problema,
            quién se hace cargo, para cuándo y si ya se resolvió.
          </p>

          <h2 className="mt-6 text-sm font-medium">Qué falta definir</h2>
          <ul className="mt-2 space-y-2 text-sm text-[var(--color-piedra)]">
            <li>
              <strong className="font-medium text-[var(--color-tinta)]">
                Si las acciones las carga el equipo o las propone el tablero.
              </strong>{" "}
              Cargarlas a mano necesita una tabla nueva y pantallas de alta y edición.
              Proponerlas sale de lo que ya está en la base: los locales y las secciones por
              debajo del umbral.
            </li>
            <li>
              <strong className="font-medium text-[var(--color-tinta)]">Quién las carga.</strong>{" "}
              Hoy el acceso es una lista de mails sin roles: todos ven y pueden todo. Si el plan
              de acción se escribe desde el tablero, hay que decidir si eso también.
            </li>
            <li>
              <strong className="font-medium text-[var(--color-tinta)]">
                Cuándo se da por cerrada una acción.
              </strong>{" "}
              Si se marca a mano o si se cierra sola cuando la siguiente auditoría del local
              supera el umbral.
            </li>
          </ul>

          <p className="mt-6 border-t border-[var(--color-borde)] pt-4 text-xs text-[var(--color-piedra)]">
            Las auditorías presenciales todavía no tienen umbral de aceptación acordado con
            CENFOR. Es el mismo número que necesita esta sección para saber qué es un problema.
          </p>
        </div>
      </div>
    </>
  );
}
