# Privacidad de listas personalizadas

## Alcance de esta entrega

El usuario aplicó la [migración de visibilidad](../supabase/migrations/202611070001_list_visibility.sql) en Supabase. Se verificó que el RPC remoto admite llamadas anónimas y devuelve `null` para un token inexistente.

Desde una colección personalizada, **Compartir** abre el selector de privacidad. Cada opción se guarda con la sesión del dueño y el link aparece cuando la base confirma el cambio. Cualquiera con el enlace vigente puede leer la colección. Con sesión se puede seguir la lista, hacer una copia y actualizar el progreso personal desde las tarjetas. La integración con el perfil público queda para otra fase.

| `lists.visibility` | Dueño | Otro usuario o visitante anónimo | Perfil público futuro |
| --- | --- | --- | --- |
| `private` (default) | Lee y edita | Sin acceso, incluso con un enlace anterior | No |
| `link` | Lee y edita | Solo lectura mediante el token exacto | No |
| `public` | Lee y edita | Solo lectura por enlace o consulta pública | Sí |

Las filas existentes quedan privadas. `createList` ya omite la visibilidad y utiliza el nuevo default de PostgreSQL sin cambios de UI. Las restricciones rechazan visibilidades desconocidas o nulas.

## Enlaces y permisos

`share_slug` es único y lo genera la base de datos al compartir: UUID aleatorio sin guiones (32 caracteres hexadecimales). Se usa un token con suficiente entropía en lugar del sufijo corto del prototipo. No deriva del nombre ni del ID de la lista, y el cliente no puede elegirlo. Renombrar la lista o pasar entre `link` y `public` mantiene el token. Volver a `private` lo elimina; compartir nuevamente genera otro y los enlaces anteriores siguen inválidos. Un enlace compartido puede ser reenviado por quien lo conoce; no es una invitación individual.

Las políticas RLS permiten consultar directamente `lists` y `list_media` al dueño o cuando la lista es pública. Las listas `link` ajenas no se pueden enumerar, ni obtener con su ID. Insertar, modificar, trasladar y eliminar títulos requiere ser dueño de la lista; cambiar `user_id` a otra cuenta también se rechaza. Visitantes anónimos solo tienen SELECT. Se revocan privilegios no necesarios como TRUNCATE, que no está protegido por RLS.

Se agregan políticas restrictivas además de las permisivas para que una política permisiva antigua no amplíe el acceso. No se eliminan políticas antiguas: una restrictiva anterior puede limitar todavía más los resultados y requiere revisión. Las cuentas administrativas que omiten RLS no deben usarse para atender lecturas de visitantes sin autorización explícita.

### Lectura por enlace

La función `get_shared_list(p_share_slug text, p_limit integer default 50, p_offset integer default 0)` está habilitada para `anon` y `authenticated` y valida un token exacto más la visibilidad vigente. Es `SECURITY DEFINER`, con `search_path` vacío y referencias calificadas, para acceder exclusivamente a esa lista sin habilitar enumeración de las listas `link`.

Devuelve `null` si el token es inválido, no existe o la lista es privada. Para una lista disponible devuelve:

- `id`, `name`, `description`, `user_id`, `visibility`, `share_slug`, `total_count`.
- `items`: IDs y fechas de las asociaciones; datos públicos de cada título (`id`, `mal_id`, `title`, `image`, `type`, `format`, `status`, `total_units`, `score`).

No consulta ni entrega notas personales, etiquetas, progreso o enlaces de reproducción de `user_media_progress`. La descripción de la lista sí es parte del contenido compartido. No modifica las políticas de `media`, perfiles, favoritos o progreso.

La función acepta hasta 100 elementos por página y conserva un orden por fecha e ID. Una lista vacía devuelve `items: []`. La vista `/l/[shareSlug]` usa 24 por página y lee con permisos anónimos. La consulta futura del perfil debe filtrar explícitamente `user_id` y `visibility = 'public'`, incluso al ver el propio perfil.

Open Graph y Twitter Cards usan el título de la lista con la marca AniTrack y la descripción «N títulos · lista de Nombre». El nombre se toma del perfil visible para visitantes, con el usuario como alternativa. La ruta `/l/[shareSlug]/preview.png` genera un PNG de 1200 × 630 con hasta tres portadas de los proveedores permitidos. La página y el PNG comprueban la visibilidad en cada lectura. Las redes sociales pueden conservar una vista previa que hayan guardado antes de la revocación.

## Aplicación en Supabase

1. Ejecutar [list_visibility_preflight.sql](../supabase/checks/list_visibility_preflight.sql) en el SQL Editor. Solo inspecciona metadatos. Revisar políticas, grants, triggers, vistas y funciones existentes que leen listas, especialmente `get_my_lists_page`. La consulta busca dependencias por nombre/cuerpo; no garantiza encontrar accesos indirectos mediante otras funciones.
2. Confirmar que los RPC `SECURITY DEFINER` existentes filtran por el usuario autenticado y que las vistas no exponen listas privadas. Las nuevas políticas no pueden corregir funciones/vistas que omiten RLS. Resolver cualquier exposición antes de desplegar; no borrar funciones o políticas sin revisar consumidores.
3. Verificar que `lists` y `list_media` no tienen ya columnas/políticas/funciones con los nombres de la migración. Es una migración de una sola aplicación, transaccional; no se debe ejecutar por partes ni repetir tras éxito. El esquema requiere los campos usados en la proyección pública de `media`.
4. Ejecutar la migración completa en el proyecto previsto y registrar su aplicación. No requiere variables de entorno nuevas ni dependencias de la app.
5. Verificar en un entorno controlado con dos cuentas y un visitante sin sesión: default privado, acceso público, acceso con token, no enumeración de `link`, rechazo de escrituras ajenas y revocación al pasar a privada. No basta probar como `postgres` o `service_role`, porque omiten RLS.

La comprobación posterior a la aplicación verificó el RPC anónimo con un token inexistente y la disponibilidad de la proyección de nombre y usuario de perfiles. La comprobación remota de aislamiento con dos cuentas sigue pendiente. OpenAPI permite confirmar columnas, pero no muestra las definiciones de políticas, vistas o funciones.

Para desactivar enlaces de emergencia, un administrador puede volver privadas las listas afectadas, lo que revoca sus tokens. No se proporciona un rollback que restaure políticas permisivas o vuelva a exponer datos; antes de revertir estructura, revisar los permisos necesarios.

## Seguir y hacer una copia

La [segunda migración](../supabase/migrations/202611070002_list_follows_and_copies.sql) depende de la de visibilidad. El usuario la aplicó y el esquema REST remoto expone los tres RPC de esta fase.

- **Seguir** llama a `follow_shared_list(p_share_slug)`. Guarda una referencia por cuenta y lista, y repetir la operación con el mismo enlace conserva el seguimiento existente. `get_my_followed_lists(p_limit, p_offset)` devuelve las referencias de la cuenta para «De amigos», con el nombre, dueño, enlace y cantidad de títulos vigentes. Para dejar de seguir, se elimina la fila propia de `list_follows` por `list_id`.
- **Hacer una copia** llama a `copy_shared_list(p_share_slug, p_copy_id)`. Crea una colección privada y editable con el sufijo «(copia)», la descripción y todos los títulos en el orden de la vista compartida. Devuelve el UUID para abrirla en «Mis listas». La app deberá generar `p_copy_id` una vez por intento y reutilizarlo si reintenta. Repetir el mismo intento devuelve la copia existente y preserva sus ediciones.

Ambas operaciones requieren sesión, una lista de otra cuenta y el token vigente. El servidor obtiene la cuenta de `auth.uid()`. El seguimiento se vincula al token con el que se autorizó. Si el original se vuelve privado, la referencia puede mostrarse como no disponible y quitarse, sin exponer el nombre, el dueño, el enlace ni el contenido. Si se comparte de nuevo, hay que seguirlo desde el nuevo enlace. Al eliminar el original se eliminan sus seguimientos.

La copia guarda `copied_from_list_id` para atribución. Si se elimina el original, la copia se conserva y ese campo queda vacío. La creación de la lista y sus títulos es atómica y solo lee datos de la colección. El progreso, las notas, etiquetas, favoritos y enlaces personales siguen perteneciendo a cada cuenta. La migración mantiene permisos de escritura sobre las columnas existentes de `lists` y reserva la procedencia para el RPC.

`/lists?tab=friends` muestra las listas seguidas de la cuenta y permite quitar un seguimiento, incluso si el original quedó privado. La página compartida muestra tres portadas, tarjetas numeradas, el panel lateral y un resumen de progreso. En listas paginadas, el resumen corresponde a los títulos de la página actual. Se leen únicamente sus filas de progreso con la sesión del visitante. Los controles reutilizan el guardado con revisión y la cola de sincronización. Se muestra el formato y la cantidad de episodios o capítulos disponibles en el RPC.

Los visitantes pueden abrir el diálogo de acceso con «Guardar lista». El retorno de OAuth acepta únicamente una ruta compartida con token válido. Al volver en la misma pestaña dentro de 15 minutos, se retoma una intención de seguimiento iniciada por el visitante. Desde otra pestaña se puede seguir la lista con el botón. El dueño puede volver directamente a su colección. La comprobación remota de escritura con dos cuentas sigue pendiente.

## Evidencia local

`tests/list-visibility-migration.test.mjs` ejecuta la migración real en PostgreSQL embebido/PGlite con el esquema mínimo confirmado y políticas antiguas intencionalmente permisivas. Cubre defaults, valores inválidos, propietario falsificado, anonimato, aislamiento entre cuentas, solo lectura, protección de notas/progreso, tokens exactos, cambio de visibilidad, revocación, paginación y CRUD del dueño. No sustituye verificar el esquema completo ni RLS remoto.

Para repetir sin agregar dependencias al proyecto:

```powershell
$validationDir = Join-Path $env:TEMP 'anitrack-list-visibility-validation'
pnpm --dir $validationDir add @electric-sql/pglite@0.5.15
$env:PGLITE_MODULE = Join-Path $validationDir 'node_modules/@electric-sql/pglite'
node --test tests/list-visibility-migration.test.mjs
```

Sin `PGLITE_MODULE` la prueba se omite explícitamente. En PGlite 0.5.15 se ejecutaron ambas migraciones y se aprobaron 14 casos más el contenedor. Los casos adicionales verifican permisos, seguimiento actualizado, revocación, orden de copia, reintentos, copia de más de 100 títulos y rollback ante una falla.

Referencias: [políticas de filas de PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) y [funciones de base de datos de Supabase](https://supabase.com/docs/guides/database/functions).
