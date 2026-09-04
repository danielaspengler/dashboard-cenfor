import {
  LayoutDashboard,
  Star,
  ClipboardCheck,
  Truck,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

// El ÍNDICE del dashboard, en un solo lugar. Todo el menú lateral se dibuja
// recorriendo esta lista: sumar un área o una sección es agregar acá, sin
// tocar el componente del menú.
//
//   "activo"       → se puede entrar
//   "proximamente" → se ve en gris, no es link

export type NavStatus = "activo" | "proximamente";

export type NavSection = {
  label: string;
  href: string;
  icon: LucideIcon;
  status: NavStatus;
};

export type NavArea = {
  label: string;
  slug: string;
  icon: LucideIcon;
  status: NavStatus;
  sections: NavSection[];
};

export const NAVIGATION: NavArea[] = [
  {
    label: "Operaciones",
    slug: "operaciones",
    icon: LayoutDashboard,
    status: "activo",
    sections: [
      {
        label: "Resumen",
        href: "/operaciones/resumen",
        icon: LayoutDashboard,
        status: "activo",
      },
      {
        label: "Puntuaciones y reseñas",
        href: "/operaciones/resenas",
        icon: Star,
        status: "activo",
      },
      {
        label: "MS y Auditorías",
        href: "/operaciones/ms-auditorias",
        icon: ClipboardCheck,
        status: "activo",
      },
      {
        // Se construye última: hoy hay 2 visitas de delivery cargadas, una
        // de ellas marcada para revisar. Una pantalla entera sobre una
        // visita válida no dice nada todavía.
        label: "Delivery",
        href: "/operaciones/delivery",
        icon: Truck,
        status: "activo",
      },
      {
        // El lugar está reservado y la pantalla explica qué va a ir adentro.
        // El contenido se define con el cliente: hasta saber si son tareas
        // que carga el equipo o una lista que sale sola de los puntajes
        // bajos, cualquier cosa que se construya se tira.
        label: "Plan de acción",
        href: "/operaciones/plan-accion",
        icon: ListChecks,
        status: "activo",
      },
    ],
  },
  // Marketing y Administración estaban acá en gris, copiadas del esqueleto del
  // maestro. Salieron el 04/09/2026: un menú que anuncia dos áreas vacías
  // promete trabajo que no está comprometido. Vuelven cuando haya fuentes que
  // las alimenten — agregar el área a esta lista es todo lo que hace falta.
];
