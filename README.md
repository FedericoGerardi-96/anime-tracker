# AniTrack

Aplicación para explorar anime y manga, llevar el progreso personal, organizar listas y conectar bibliotecas con AniList y MyAnimeList. Usa Supabase para autenticación y persistencia. El rediseño propuesto está orientado al autor y su grupo de amigos.

## Documentación y trabajo con asistentes

- [AGENTS.md](AGENTS.md): pautas permanentes de desarrollo, UX/UI, datos y validación.
- [Estado y próximos pasos](docs/ESTADO.md): contexto para continuar entre chats.
- [Prompts reutilizables](docs/PROMPTS.md): inicio de tarea, rediseño, funciones, errores y revisión.
- [Guardado y sincronización](docs/guardado-local-y-sincronizacion.md): cola de cambios, activación y pruebas.
- [Requisitos del rediseño](Requerimientos/AniTrack%20%C2%B7%20Requerimientos%20del%20redise%C3%B1o.md) y [guía visual](Requerimientos/AniTrack-rediseno/LEEME.md): destino del producto, todavía no equivalente al estado implementado.

Codex reconoce `AGENTS.md` como instrucciones de proyecto al iniciar una sesión en este repositorio. Los acuerdos deben quedar guardados aquí para acompañar al código; no dependen de recordar conversaciones. Para otros asistentes, pedí explícitamente que lean el archivo. [Documentación oficial](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

## Stack y estructura

Versiones declaradas al 2026-11-01: Next.js **16.4.3** con App Router, React **19.2.3**, TypeScript **5**, Tailwind CSS **4**, ESLint **9** y Supabase con `@supabase/ssr`. Ver `package.json` y `pnpm-lock.yaml` para el estado vigente.

| Directorio | Responsabilidad |
| --- | --- |
| `src/app` | Páginas, layouts, estados de carga y Route Handlers |
| `src/components` | Componentes por función y elementos UI compartidos |
| `src/services` | Catálogo, datos de usuario, proveedores y sincronización |
| `src/lib/actions` | Server Actions de autenticación y mutaciones |
| `src/lib/supabase` | Clientes de navegador, servidor, administrador y sesión |
| `src/lib`, `src/hooks`, `src/interfaces`, `src/types` | Utilidades, hooks y contratos |
| `src/proxy.ts` | Entrada del proxy que delega la actualización de sesión |
| `supabase/migrations` | Migraciones disponibles en este checkout |
| `scripts`, `tests` | Herramientas y pruebas disponibles |
| `Requerimientos` | Requisitos, HTML, capturas y CSS del rediseño |

Los catálogos seleccionan AniList o MyAnimeList mediante los servicios existentes. `src/services/catalog-provider.ts` lee la preferencia de proveedor. Las integraciones adaptan los datos al modelo de la app; no intercambiar IDs de proveedores.

Las escrituras de biblioteca/progreso se guardan en Supabase y los cambios pendientes se envían mediante el flujo de sincronización. Para modificarlo, consultar su documentación y la migración asociada.

## Rutas principales actuales

| Ruta | Uso |
| --- | --- |
| `/` | Inicio |
| `/anime`, `/manga` | Catálogos |
| `/anime/[slug]`, `/manga/[slug]` | Fichas |
| `/anime/[slug]/characters`, `/characters`, `/characters/[slug]` | Personajes |
| `/anime/schedule` | Calendario |
| `/favorites`, `/lists` | Biblioteca/favoritos y listas |
| `/profile`, `/profile/highlights` | Perfil, configuración y destacados |
| `/friends`, `/users/[username]`, `/users/[username]/favorites` | Funciones sociales |
| `/login`, `/register`, `/auth/callback` | Autenticación |
| `/hentai` | Sección de contenido adulto |
| `/api/anilist/*`, `/api/mal/*`, `/api/library/sync*` | Conexiones y sincronización |

Las rutas nuevas de los requisitos se incorporarán por fases. No sustituir enlaces actuales por rutas propuestas que todavía no existen.

## Desarrollo local

Usar Node.js compatible con Next.js 16 (mínimo 20.9) y pnpm. No está fijada una versión de pnpm mediante `packageManager`; conservar el formato del lockfile existente.

```powershell
pnpm install --frozen-lockfile
# Solo si todavía no existe .env.local:
if (-not (Test-Path -LiteralPath .env.local)) {
    Copy-Item -LiteralPath .env.example -Destination .env.local
}
# Completar .env.local antes de iniciar:
pnpm dev
```

La URL de Supabase incluida en el ejemplo debe reemplazarse por la del entorno elegido. El ejemplo enumera variables públicas de Supabase, clave de servicio para operaciones de servidor, clientes OAuth y claves de cifrado de MAL/AniList. Nunca versionar credenciales reales. Las URI de retorno deben coincidir con la configuración de cada proveedor.

Las banderas `FAVORITES_RPC_ENABLED`, `LISTS_RPC_ENABLED` y `LIBRARY_FILTERS_RPC_ENABLED` solo se activan si existen sus funciones de base de datos. El repositorio no incluye un procedimiento completo para reconstruir todo el esquema Supabase desde cero; no asumir que instalar dependencias o aplicar una sola migración basta.

Abrir `http://localhost:3000` si el servidor usa el puerto predeterminado. `pnpm dev` ejecuta `scripts/dev.mjs`, que genera el subconjunto de iconos antes de iniciar Next.js.

## Comandos y verificación

| Comando | Propósito |
| --- | --- |
| `pnpm dev` | Desarrollo |
| `pnpm build` | Generación de iconos y build de producción |
| `pnpm start` | Servidor de producción después del build |
| `pnpm lint` | ESLint del repositorio |
| `pnpm exec eslint <archivos>` | Lint enfocado en archivos de código modificados |
| `pnpm exec tsc --noEmit` | Comprobación de tipos |
| `pnpm icons:generate` | Regenerar subconjunto de Material Symbols |
| `node --test tests/pending-library-sync.test.mjs` | Pruebas de sincronización pendiente |
| `node --test tests/home-airing.test.mjs` | Validación y zonas horarias de emisiones de Inicio (Node.js 24) |
| `node --test tests/catalog-filter-navigation.test.mjs` | Parámetros y compatibilidad de filtros del catálogo (Node.js 24) |
| `node --test tests/home-greeting.test.mjs` | Nombre y fecha local del saludo de Inicio (Node.js 24) |
| `node --test tests/home-watching.test.mjs` | Selección y episodios restantes en Inicio (Node.js 24) |
| `node --test tests/pending-library-migration.test.mjs` | Prueba de migración con PGlite externo |

La prueba de migración requiere `PGLITE_MODULE` apuntando a una instalación externa de `@electric-sql/pglite`; sin esa variable se omite. Ver la [guía de sincronización](docs/guardado-local-y-sincronizacion.md).

Al revisar este checkout, los scripts `test:anilist-sync`, `test:provider-sync`, `test:oauth-return`, `test:audit` y `test:sync` referencian archivos que no están presentes. No usarlos como evidencia de una suite completa hasta recuperar o actualizar esas pruebas. No se cambiaron los scripts en esta entrega documental.

Next.js 16 no ejecuta lint durante `next build`: son verificaciones separadas. Para cambios de interfaz, sumar comprobación en navegador de responsive, temas, teclado y estados. Para documentación solamente, validar enlaces, rutas y consistencia. [Guía oficial de Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16).
