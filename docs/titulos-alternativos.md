# Títulos alternativos y búsqueda de biblioteca

`media.title` sigue siendo el nombre que se muestra y el que se usa para ordenar. `title_english` y `title_romaji` son metadatos opcionales de catálogo, compartidos por obra. No representan una preferencia de idioma. Romaji es el título original romanizado, como «Yagate Kimi ni Naru»; no es el nombre escrito con caracteres japoneses.

## Activación

1. Aplicar [`202611110001_media_title_variants.sql`](../supabase/migrations/202611110001_media_title_variants.sql) en el SQL Editor del proyecto Supabase antes de desplegar el código. La migración agrega dos columnas `text` que admiten `null`, sin cambiar títulos, identidades, relaciones, permisos ni RLS.
2. Completar los registros anteriores con el script de mantenimiento descrito abajo.
3. Desplegar la aplicación y comprobar una búsqueda por ambos nombres con sesión.

No hacen falta nuevas variables ni dependencias. Si la fuente no informa un título oficial en inglés, el registro conserva `title_english = null`; no se inventa una traducción.

## Guardado y búsqueda

El catálogo de AniList conserva `english` y `romaji`; los adaptadores de MAL conservan `alternative_titles.en` y el título principal. Estos nombres viajan con las cards, la ficha y el modal hasta las acciones de guardado. Crear una entrada desde un favorito, una lista o un estado persiste las variantes que estén disponibles sin consultar proveedores en la mutación. La importación completa de ambas bibliotecas conserva los mismos campos al crear `media`. Cuando reconcilia un registro existente, completa únicamente las variantes nulas mediante actualizaciones condicionales y respeta la protección de cambios pendientes. Copiar o agregar a otra colección reutiliza la identidad local existente.

Biblioteca completa, las vistas por estado y las colecciones buscan en `title`, `title_english`, `title_romaji`, nota y etiquetas. Se conserva la normalización anterior de mayúsculas, acentos y puntuación, además de filtros y paginación. Toda la búsqueda usa Supabase; no consulta AniList ni MAL al escribir, abrir o filtrar Mis listas.

Las definiciones de los RPC antiguos `get_my_favorites_page` y `get_my_lists_page` no están versionadas en este repositorio y no se asume que busquen variantes. Por eso una consulta de texto usa las lecturas de compatibilidad de Supabase aun con las banderas RPC activadas. Estas lecturas recorren por páginas los datos del usuario, filtran y paginan en servidor; al cliente llega solo la página visible. Sin texto se conserva el camino RPC configurado. Si aumenta mucho el tamaño de las bibliotecas, el próximo paso es versionar los RPC y agregar allí la búsqueda equivalente.

La sección Hentai usa otra tabla y queda fuera de esta migración. Las listas, favoritos y progreso siguen separados; la cola de sincronización y sus permisos no cambian.

## Completar registros anteriores una vez

Desde la raíz del repositorio, con Node.js compatible y las credenciales de servidor de `.env.local` ya configuradas:

```powershell
# Vista previa de hasta 25 registros; no escribe en Supabase.
node scripts/backfill-media-titles.mjs --limit=25

# Completar todos los registros pendientes.
node scripts/backfill-media-titles.mjs --apply
```

Para reanudar desde una tanda completa, agregar `--after=UUID` al comando de escritura, reemplazando `UUID` por el cursor que imprimió el log.

El script usa el cargador de entorno de la versión instalada de Next.js y requiere `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. La clave se usa solo en este proceso local; no se imprime, se copia al navegador ni se incorpora a la aplicación cliente. El acceso administrativo está limitado a este comando de mantenimiento invocado explícitamente.

Lee hasta 25 filas por tanda con orden estable por ID y agrupa las consultas a AniList por tipo. Cruza exclusivamente `idMal` y `ANIME`/`MANGA`, valida la respuesta y rechaza equivalencias ambiguas. Espera al menos cinco segundos entre solicitudes a AniList y respeta `Retry-After`, agotamiento de cuota y hora de reinicio. Los fallos de red, 429 y 5xx tienen un máximo de cuatro intentos. No es un cron ni un proceso de la pantalla Mis listas.

Solo escribe `title_english` y `title_romaji`, y solo si cada columna sigue siendo `null` al actualizar. Nunca sustituye `title`, IDs, imágenes, progreso, favoritos o asociaciones. El proceso se puede repetir: una tanda parcial no borra información ni sobrescribe un nombre que otro proceso haya completado. Si no existe correspondencia en AniList o falta un nombre oficial, el campo permanece vacío y se informa el conteo. Las filas que sigan teniendo un campo nulo se revisarán de nuevo si se ejecuta otra vez; un inglés ausente no significa por sí solo que haya fallado el proceso.

## Verificación

```powershell
node --test tests/media-titles.test.mjs tests/media-titles-backfill.test.mjs

# Prueba de SQL, permisos existentes y dos usuarios con PGlite externo:
$env:PGLITE_MODULE = '<ruta-externa>/node_modules/@electric-sql/pglite'
node --test tests/media-titles-migration.test.mjs
```

La prueba SQL se omite explícitamente si falta `PGLITE_MODULE`. No sustituye revisar el esquema real y comprobar la búsqueda con una sesión después de desplegar.
