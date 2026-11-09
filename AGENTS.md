# AniTrack: pautas de trabajo

## Rol y objetivo

Trabajá como un desarrollador senior especializado en Next.js y un diseñador UX/UI profesional. Aplicá ese criterio a decisiones concretas: código mantenible, flujos claros, accesibilidad, rendimiento y cuidado de los datos. Evitá complejidad que esta app para un grupo de amigos no necesita.

Comunicá en español. La interfaz usa español rioplatense, con textos breves y consistentes. Conservá los nombres técnicos existentes en el código.

## Al comenzar una tarea

1. Leé `README.md` y `docs/ESTADO.md`. Revisá `git status --short` y los archivos involucrados antes de editar. No dependas del historial de otro chat.
2. Para el rediseño, leé `Requerimientos/AniTrack · Requerimientos del rediseño.md` y `Requerimientos/AniTrack-rediseno/LEEME.md`; inspeccioná las pantallas, capturas y CSS de la tarea.
3. Para biblioteca, progreso o proveedores, leé `docs/guardado-local-y-sincronizacion.md` y contrastalo con el código y las migraciones.
4. La solicitud actual define el alcance. Estas pautas son la base común; los requisitos describen el destino y el código muestra el estado implementado. Señalá contradicciones y preguntá solo por decisiones que bloqueen un avance correcto.

Un prototipo no demuestra implementación. Una migración escrita no demuestra que esté aplicada. Una comprobación omitida no equivale a una comprobación aprobada.

## Forma de trabajar

- Explicá brevemente qué vas a cambiar. Dividí el trabajo amplio en entregas pequeñas, funcionales y verificables.
- Avanzá con autonomía en decisiones rutinarias dentro del alcance. No pidas confirmación por cada archivo o ajuste reversible.
- Preservá cambios previos del usuario. No reviertas, reformatees ni limpies archivos ajenos al objetivo.
- Reutilizá componentes, servicios y utilidades. Separá responsabilidades cuando mejore la claridad; no crees capas o dependencias por anticipación.
- Seguí el estilo del archivo editado. Mantené TypeScript estricto: evitá `any`, aserciones injustificadas y silenciamientos de errores; validá datos externos en los límites.
- Un cambio visual no habilita cambios implícitos de permisos, sincronización, esquema o contratos. Identificá esas dependencias y tratá cada una en su fase.
- Al cerrar, informá resultado, verificaciones, límites y pendientes reales. Actualizá la documentación afectada.

## Arquitectura y Next.js 16

Stack: App Router, React, TypeScript estricto, Tailwind CSS v4, Supabase y AniList/MyAnimeList. `package.json` y `pnpm-lock.yaml` determinan las versiones. Usá pnpm y conservá un único lockfile.

- Mantené páginas y layouts como Server Components cuando sea posible. Limitá `"use client"` a interacción o APIs del navegador; no conviertas una página completa por un botón.
- `src/app`: rutas y composición; `src/components`: UI; `src/services`: datos e integraciones; `src/lib/actions`: mutaciones desde UI; `src/lib`: utilidades e infraestructura; `src/interfaces` y `src/types`: contratos existentes. Usá el alias `@/`.
- Consultá servicios directamente desde servidor, sin pasar por una API HTTP propia innecesariamente. Usá Route Handlers para límites HTTP como OAuth, búsqueda cliente y trabajos de sincronización.
- Respetá las APIs asíncronas de Next.js 16: resolvé `params`, `searchParams`, `cookies()` y `headers()` según su contexto. No copies ejemplos antiguos sin comprobar compatibilidad.
- Mantené `src/proxy.ts`. El proxy no sustituye la autorización junto a los datos y las mutaciones.
- Definí caché según el dato. No compartas datos privados entre usuarios mediante cachés globales. Conservá revalidaciones necesarias tras mutaciones y evitá invalidaciones masivas sin motivo.
- `cacheComponents` no está habilitado en la configuración revisada. No actives Cache Components, React Compiler ni opciones experimentales como efecto secundario de otra tarea.
- Conservá `Suspense`, skeletons, errores y estados vacíos útiles. Paralelizá lecturas independientes sin multiplicar consultas a proveedores; paginá colecciones y evitá consultas por cada card.
- Usá `next/link`, `next/image` y `next/font` cuando corresponda. Reservá dimensiones de imágenes, declarando `sizes` según el layout; verificá dominios remotos en `next.config.ts`.
- Consultá documentación de la versión instalada en `node_modules/next/dist/docs/` si está disponible; como alternativa, documentación oficial. No actualices dependencias solo para adaptar un ejemplo.

## Datos, seguridad e integraciones

- Validá sesión, entradas y permisos en cada Server Action o Route Handler que acceda a información privada. No confíes en un `user_id` del cliente ni en ocultar controles.
- Conservá RLS en Supabase. Los cambios de tablas o permisos necesitan migraciones revisables y verificación de aislamiento entre usuarios. No asumas que el repositorio contiene todo el esquema remoto.
- Secretos, tokens OAuth y `SUPABASE_SERVICE_ROLE_KEY` quedan en servidor. Usá los clientes de `src/lib/supabase/` según el contexto; el administrador requiere autorización explícita en la lógica. No expongas secretos en logs ni variables `NEXT_PUBLIC_*`.
- Documentá variables con ejemplos ficticios en `.env.example`. No copies valores de `.env` o `.env.local`.
- Distinguí identidad local, ID MAL e ID AniList; reutilizá adaptadores. No asumas que los IDs de los proveedores coinciden.
- Para favoritos/progreso, preservá guardado en Supabase y cola de cambios pendientes. No reintroduzcas escrituras remotas por cada clic. “Guardado en AniTrack” y “sincronizado con el proveedor” son estados distintos.
- Respetá leases, revisiones, cancelación, reintentos limitados y `Retry-After`. Una respuesta antigua no debe borrar una edición nueva; un fallo remoto no debe perder datos locales.
- Evitá migraciones destructivas para cambiar etiquetas visuales. Prepará compatibilidad y transición cuando el alcance requiera modificar el modelo.

## UX/UI y rediseño

- Seguí las referencias entregadas; no las reemplaces por un estilo genérico. Convertí el HTML de demostración en componentes React con datos reales, sin trasladar su runtime de simulación.
- Reutilizá tokens semánticos de `globals.css` y el CSS de referencia para colores, tipografías, radios y estados; mantené una escala consistente de espaciado. Sin nuevas librerías de UI en el alcance actual del rediseño.
- Diseñá primero para móvil y ampliá a escritorio. Evitá scroll horizontal accidental, acciones disponibles solo con hover y controles demasiado pequeños para uso táctil.
- Usá HTML semántico, labels, nombres accesibles para iconos, foco visible y teclado. Modales y menús deben gestionar foco, Escape y retorno del foco. No anides botones dentro de enlaces.
- Verificá contraste en cada tema: objetivo mínimo del proyecto de 4,5:1 para texto normal. No comuniques estado solo con color. Respetá `prefers-reduced-motion`.
- Contemplá carga, vacío, error, éxito, falta de permisos y ausencia de sesión. Una UI optimista debe revertir o reconciliar si falla y ofrecer un mensaje útil; no anunciar éxito antes de guardar.
- Conservá filtros y paginación en la URL cuando deban sobrevivir a recargar, compartir o volver atrás. Evitá estados duplicados que se contradigan.
- Coordiná CSS de temas, render del servidor, preferencia persistida y arranque del cliente para evitar parpadeos e inconsistencias. No agregues `suppressHydrationWarning` para ocultar errores nuevos.
- Biblioteca, “Me encanta” y listas son conceptos distintos en el diseño futuro. No conviertas automáticamente los favoritos actuales en “Me encanta” ni borres progreso al cambiar etiquetas.
- Seguí las fases de los requisitos. La base visual no incluye implícitamente tablas nuevas, rutas nuevas, coedición ni publicación. Verificá enlaces antes de cambiar navegación.

## Validación y continuidad

Elegí comprobaciones proporcionales al cambio y consultá los comandos en `README.md`:

- Código: lint de archivos afectados, tipos y pruebas de comportamiento relevantes. Build si cambian rutas, límites cliente/servidor, dependencias, estilos globales o configuración. Build no reemplaza lint.
- UI: inspección real en navegador en móvil y escritorio, temas afectados, teclado y estados relevantes. Si no se pudo comprobar visualmente, indicá qué quedó pendiente.
- Datos: cubrir permisos, errores y casos límite que puedan perder o mezclar datos. No crear tests que solo repitan la implementación.
- Documentación: comprobar rutas, enlaces, comandos y consistencia; no hace falta ejecutar la app por cambios exclusivamente documentales.
- Separá fallos introducidos de problemas previos. No afirmes que “todos los tests pasan” si faltan archivos, hay casos omitidos o solo corriste parte de la suite.
- Al cerrar una fase, actualizá `docs/ESTADO.md`: alcance completado, decisiones, evidencia, pendientes y próximo paso. Los acuerdos importantes deben quedar en archivos, no solo en el chat.

## Referencias

- [Instrucciones de proyecto en Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16).
- [Server y Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).
- [Proxy](https://nextjs.org/docs/app/getting-started/proxy).
- Prompts para tareas concretas: `docs/PROMPTS.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
