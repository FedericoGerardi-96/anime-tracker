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

Una página normal del catálogo requiere una consulta (salvo caché, reintentos o filtros que necesiten combinar páginas). Abrir una ficha puede requerir otra consulta de detalles y otra de personajes. Las búsquedas mientras se escribe también son consultas. Esas lecturas siguen siendo necesarias.

Agregar tres favoritos y después cambiar sus estados ya no realiza las doce llamadas de sincronización inmediata que podían generar esas seis acciones. Las escrituras remotas ocurren al enviar pendientes y se agrupan por estado final. Se quitaron además el enriquecimiento remoto al crear el registro local y las invalidaciones de catálogo de las acciones de guardado. Las revalidaciones de vistas locales se mantienen.

## Pruebas

- `node --test tests/pending-library-sync.test.mjs`: separación de tandas, cambios concurrentes, confirmación por revisión, eliminaciones, conservación del estado remoto y ausencia de importaciones de sincronización inmediata en las acciones.
- `tests/pending-library-migration.test.mjs`: ejecutar con PGLITE_MODULE apuntando a una instalación de `@electric-sql/pglite` externa al proyecto; prueba la migración real, deduplicación, rollback, RLS y exclusión de importaciones. Sin esa variable se omite explícitamente.

No se enviaron cambios a cuentas reales durante las pruebas.
