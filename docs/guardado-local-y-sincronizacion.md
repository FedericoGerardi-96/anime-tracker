# Guardado local y envío de cambios pendientes

## Activación

1. Ejecutar `supabase/migrations/202610280001_library_sync_pending.sql` en el SQL Editor del proyecto de Supabase antes de desplegar este código.
2. Desplegar la aplicación.
3. Guardar un favorito o cambiar su progreso y abrir el panel de sincronización. Elegir el proveedor y «Enviar cambios pendientes».

La migración no fue aplicada al proyecto remoto. Se verificaron los tipos de las tablas existentes con el esquema REST (sin leer registros de usuarios), y se ejecutó la migración en PostgreSQL embebido/PGlite para probar sus triggers y permisos. No se requieren variables nuevas ni un worker externo.

## Funcionamiento

Las acciones de favoritos y progreso solo escriben en Supabase. Los triggers en favorites, user_media_progress y hentai guardan una entrada pendiente por usuario, proveedor, tipo e ID MAL. Los cambios de estado/progreso reemplazan el valor pendiente anterior. Las eliminaciones quedan registradas aunque ya no exista el favorito. La escritura local y su registro pendiente pertenecen a la misma transacción.

Solo se encolan cambios para cuentas vinculadas en ese momento. La cuenta remota queda identificada en cada entrada, para no enviarla accidentalmente a otra cuenta al reconectar. Los cambios anteriores a la migración y las cuentas conectadas después requieren usar la comparación completa cuando corresponda.

El panel conserva el runner existente: se inicia manualmente y continúa por tandas mientras la pestaña está visible y conectada. No hay un cron ni sincronización inmediata por cada clic. Al cerrar o esconder la pestaña, termina la tanda actual y espera a que se vuelva a abrir la app.

Cada tanda pendiente realiza como máximo una operación de biblioteca en el proveedor: primero resuelve/consulta, en otra tanda escribe si hay diferencias. Usa el lease global y los cooldowns ya existentes; respeta 429/Retry-After. Una revisión UUID impide confirmar/borrar un cambio local más nuevo que llegó mientras se escribía. Tras un error se vuelve a consultar el estado remoto antes de repetir una escritura potencialmente aplicada.

Agregar un favorito sin editar su progreso conserva una entrada remota ya existente. Una edición explícita de progreso sí envía el estado elegido. Los datos siguen guardados en Supabase aunque un proveedor falle. Cancelar el trabajo no elimina pendientes.

La comparación completa sigue disponible para importar/reconciliar bibliotecas; no empieza si hay cambios pendientes del proveedor seleccionado. Durante una comparación activa, los elementos con pendientes locales no se importan por encima de esos cambios. Las importaciones administrativas no generan cambios pendientes de vuelta.

## Solicitudes

Las siguientes cifras corresponden a un render con caché fría y respuestas exitosas de los proveedores. Las consultas GraphQL de AniList usan `POST https://graphql.anilist.co`. Las rutas REST de la tabla usan `GET https://api.myanimelist.net/v2`.

| Página | Con AniList seleccionado | Con MyAnimeList seleccionado |
| --- | --- | --- |
| `/anime` | 1 AniList (`Catalog`) | 1 REST (`/anime/ranking`, `/anime?q=…` o `/anime/season/{año}/{temporada}`) |
| `/manga` | 1 AniList (`Catalog`) | 1 REST (`/manga/ranking` o `/manga?q=…`) |
| `/anime/[slug]` | 1 AniList (`Detail`, incluidos personajes principales y relaciones) + 2 REST a `/anime/{id}` (puntaje y recomendaciones con campos distintos) | 1 AniList (banner, puntaje y relaciones) + 2 REST a `/anime/{id}` (ficha y recomendaciones) + 1 GET a `https://myanimelist.net/anime/{id}/_/characters` |
| `/manga/[slug]` | 1 AniList (`Detail`) + 1 REST a `/manga/{id}` (recomendaciones) | 2 REST a `/manga/{id}` (ficha y recomendaciones) |

En los catálogos, seleccionar tramos de puntaje separados puede requerir varias páginas por tramo. En anime, si las lecturas relacionadas guardadas en Supabase faltan o vencieron, se intenta un GET a `https://myanimelist.net/anime/{id}/_`. Si falla, se reutilizan las relaciones de `Detail`. La equivalencia de IDs (GitHub) y los puntajes de IMDb tienen cachés propias. Abrir «Ver todos» sí consulta el reparto completo y paginado.

La caché de datos de Next revalida las consultas de catálogo de AniList cada cinco minutos y las de ficha cada hora. Una coincidencia fresca evita la salida al proveedor. Con sesión, los catálogos hacen dos lecturas agrupadas en Supabase para marcar favoritos (`favorites` y `hentai`). Las fichas consultan esas marcas, las colecciones (`list_media`) y el progreso (`user_media_progress`). La sesión y el perfil del encabezado se resuelven por separado.

El navbar de escritorio consulta `GET /api/catalog/search?type=…&q=…` con tres o más caracteres y 500 ms de espera mientras se muestran las sugerencias. Cada consulta de anime o manga puede hacer una lectura del proveedor seleccionado. Al cerrar las sugerencias, se cancela el temporizador o la espera del cliente. Una consulta que ya salió hacia el proveedor puede haber consumido cuota. El buscador móvil consulta al enviar el formulario al catálogo.

Agregar tres favoritos y después cambiar sus estados ya no realiza las doce llamadas de sincronización inmediata que podían generar esas seis acciones. Las escrituras remotas ocurren al enviar pendientes y se agrupan por estado final. Se quitaron además el enriquecimiento remoto al crear el registro local y las invalidaciones de catálogo de las acciones de guardado. Las revalidaciones de vistas locales se mantienen.

Los títulos en inglés y romaji se conservan con los metadatos que ya devuelve el catálogo o la ficha, sin agregar lecturas al guardar ni al buscar en Mis listas. Las importaciones de AniList y MAL también los guardan. La actualización única del catálogo anterior es un script de mantenimiento independiente; ver [títulos alternativos](titulos-alternativos.md).

## Pruebas

- `node --test tests/pending-library-sync.test.mjs`: separación de tandas, cambios concurrentes, confirmación por revisión, eliminaciones, conservación del estado remoto y ausencia de importaciones de sincronización inmediata en las acciones.
- `tests/pending-library-migration.test.mjs`: ejecutar con PGLITE_MODULE apuntando a una instalación de `@electric-sql/pglite` externa al proyecto; prueba la migración real, deduplicación, rollback, RLS y exclusión de importaciones. Sin esa variable se omite explícitamente.

No se enviaron cambios a cuentas reales durante las pruebas.


## Editor lateral de Mis listas

El editor de tabla usa las acciones de `src/lib/actions/library-editor.ts`: reutiliza la versión leída para la tabla y guarda progreso o metadatos por separado. La tabla incluye updated_at en su consulta existente, por lo que abrir el panel no dispara otra lectura; solo los datos sin versión usan la lectura de respaldo con skeleton. Cada actualización incluye el `updated_at` leído, además de `user_id` y `media_id`; si no coincide se rechaza y se pide reabrir el editor. Una inserción concurrente no sobrescribe el registro existente. La respuesta usa el registro devuelto por la misma escritura.

Estado, input de episodio y botones ± actualizan un borrador visible y agrupan cambios tras 450 ms sin interacción. Solo hay una escritura en curso: los controles de progreso siguen disponibles y un cambio posterior espera para usar la revisión devuelta por la escritura anterior. Una respuesta anterior no reemplaza un borrador más reciente. Ante un error se conserva el borrador y se detiene el guardado automático hasta reintentar o editar; no se anuncia éxito mientras haya progreso pendiente. Nota, enlace y etiquetas requieren Guardar y esperan a que termine el progreso. Cerrar con ×, Escape o el fondo oculta el diálogo sin desmontar la sesión de edición: continúan la escritura y el último progreso pendiente. El resultado o error se informa con un toast temporal de cinco segundos y cierre manual; errores y borradores ofrecen Volver a editar. El borrador se conserva aunque el aviso desaparezca y también se recupera desde Editar en la fila. Los metadatos no enviados siguen requiriendo Guardar. Estas sesiones viven mientras la tabla esté montada; no persisten al recargar o cerrar la pestaña. Todas las escrituras requieren la cola existente y siguen generando pendientes mediante sus triggers. Quitar de favoritos elimina solo la fila del usuario en `favorites`, sin alternar ni borrar progreso, metadatos o colecciones.

`node --test tests/library-editor.test.mjs` verifica las acciones con un cliente simulado, incluidos conflictos y filtros por usuario. No reemplaza las pruebas de integración de la migración ni una comprobación de RLS real.


## Contador de la ficha

Los botones ± y la entrada directa de episodio/capítulo agrupan cambios durante 600 ms mediante `useDetailProgress`. Reutilizan `saveLibraryEditor` con el ID local y la revisión leídos por `getMediaProgress`; no llaman a `addMediaToLists` ni reescriben colecciones por cada episodio. Una sola escritura en curso, borrador posterior preservado y error sin reintento automático. Los límites, la sesión, la cola y el conflicto entre pestañas se verifican en servidor. El guardado confirmado se distingue del borrador pendiente y no significa sincronización remota. El flujo previo para elegir estado o agregar el título se conserva y actualiza la revisión local al terminar. `tests/detail-progress.test.mjs` cubre el debounce y las respuestas en vuelo con tiempo y red controlados; no sustituye una prueba de escritura con cuenta real.
