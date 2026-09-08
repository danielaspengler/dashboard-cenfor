# Historia

> Una línea por sesión, de la más nueva a la más vieja.

| Fecha | Feature | Qué pasó |
|---|---|---|
| 2026-09-08 | — | Arnés instalado desde `plantilla-arnes`. Prefijo de features: **C**. |
| 2026-09-08 | C9 · seguridad | **Clave de Google rotada.** La cuenta de servicio `cenfor-sync@` tenía la clave `3c8bf146` (03/09), que se había impreso completa en una conversación. Se creó la `e9081c5f`, se actualizó en `.env.local` y en Vercel (Production), redeploy, y recién después se borró la vieja. Verificado con la nueva: ensayo en seco OK (29 · 9 · 8 · 6) y `/api/sync` en producción 200 en 7 s, cinco fuentes, 320 filas. **Se descubrió que el sync de delivery ya estaba integrado** (268 filas): lo que falta de C9 es solo la pantalla. UI de Vercel: las variables ya no están en "Environment Variables" sino dentro de cada entorno, en **Settings → Environments → Production**. |
