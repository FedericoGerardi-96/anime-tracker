# AniTrack · Requerimientos del rediseño

Oct 30, 2026 · @Rodri

## Objetivo y alcance

Rediseñar AniTrack con identidad propia y convertir **Listas** en el centro del sitio, sin rehacer lo que ya funciona. El catálogo conserva su grilla y su lógica; cambia su barra de filtros y sus cards.

- **Usuarios:** el autor y su grupo de amigos. No hay requisitos de escala pública por ahora.
- **Stack:** Next.js 16 (App Router), Tailwind v4, Supabase, AniList y MyAnimeList. Sin librerías de UI nuevas.
- **Referencia visual:** el lienzo “AniTrack Rediseño” en Claude Design y el ZIP exportado (pantallas en HTML, capturas y `temas.css`).
- **Idioma:** toda la interfaz en español rioplatense. Se eliminan los textos en inglés (Add to List, Airing, Save Selection, MEMBER, Adult Content).

Este documento describe los flujos que en el lienzo se ven como pantallas sueltas: cómo se llega a cada una, qué hace cada control y qué se guarda.

## Conceptos y modelo

Hoy la tabla `favorites` funciona como biblioteca (todo lo que se sigue, con estado y episodio), pero la interfaz la llama “favoritos”. El rediseño separa tres conceptos que no se mezclan:

| Concepto | Qué es | Cómo se activa | Dónde se ve |
| --- | --- | --- | --- |
| Biblioteca | Todo título con un estado | Elegir un estado en la card o la ficha | Listas › Biblioteca, Inicio, Calendario |
| Me encanta (♥) | Gusto personal, ordenable | Corazón en la card o la ficha | Lista “Me encanta”, Top del perfil |
| Listas | Colecciones con nombre | Crear lista o “Guardar en lista” | Listas › Mis listas y De amigos |

**Estados de seguimiento** (uno por título, opcional): Viendo, Completado, Pendiente, En pausa, Abandonado. Sin estado = el título no está en la biblioteca.

Reglas:

1. Elegir cualquier estado agrega el título a la biblioteca.
2. Completado lleva el episodio al total. Viendo con episodio 0 lo pone en 1.
3. Llegar al último episodio con +1 cambia el estado a Completado.
4. Quitar de la biblioteca (opción “Quitar” en el menú de estado) borra estado y progreso, pero no saca el título de las listas ni el ♥.
5. Me encanta y las listas son independientes del estado: un título puede tener ♥ sin estado.

## Navegación y rutas

Barra superior: logo, **Inicio · Anime · Manga · Calendario · Listas · Amigos**, búsqueda global (atajo Ctrl K) y avatar. “Favoritos” sale de la barra: pasa a ser la lista “Me encanta” dentro de Listas. El selector Anime/Manga de la búsqueda pasa a ser un filtro dentro de los resultados.

| Ruta | Pantalla | Estado |
| --- | --- | --- |
| `/` | Inicio | Cambia |
| `/anime`, `/manga` | Catálogo | Cambian filtros y cards |
| `/anime/[slug]`, `/manga/[slug]` | Ficha | Cambia |
| `/calendar` | Calendario semanal | Cambia |
| `/lists` | Listas (biblioteca + mis listas + de amigos) | Cambia |
| `/lists/[id]` | Una lista propia | Nueva |
| `/lists/inbox` | Bandeja de recomendaciones | Nueva |
| `/l/[shareSlug]` | Lista compartida (pública por link) | Nueva |
| `/users/[username]` | Perfil público | Cambia |
| `/settings/[section]` | Ajustes: perfil, apariencia, privacidad, cuentas, contenido adulto | Nueva (sale de `/profile`) |
| `/favorites` | — | Redirige a `/lists?list=me-encanta` |

Las rutas existentes de personajes, amigos y hentai no cambian de lugar; solo toman el nuevo estilo.

## Sistema visual y temas

Todo color sale de variables CSS; ningún componente usa un color fijo. El archivo `codigo/temas.css` del ZIP reemplaza los bloques `:root` y `.dark` de `globals.css` y mantiene los nombres actuales (`--background`, `--card`, `--primary-color`…), así las clases de Tailwind siguen funcionando.

- **Tipografías** (con `next/font/google`): Unbounded para títulos y marca, Manrope para interfaz, JetBrains Mono para episodios, horarios y puntajes. Barlow Condensed solo en el tema Estreno.
- **Variables nuevas:** `--love` (♥ y lo social), `--status-viendo|completado|pendiente|pausa|abandonado`, `--font-display`, `--display-transform`, `--radius-base`, `--page-glow` (degradé aurora del fondo).
- **Contraste:** sobre colores claros (menta, naranja) el texto va oscuro (`--primary-foreground`). Mínimo 4,5:1 en texto normal.
- **Logo:** anillo de progreso con play y chispa; SVG en el lienzo (tablero Identidad).

### Elegir tema (Ajustes › Apariencia)

| Tema | `data-theme` | Carácter |
| --- | --- | --- |
| Aurora nocturna | `aurora-nocturna` | Base: tinta oscura, auroras menta/violeta/sakura |
| Aurora clara | `aurora-clara` | Lavanda claro, mismos acentos oscurecidos |
| Estreno | `estreno` | Negro plano, naranja brasa, ♥ azul, títulos condensados, esquinas rectas |

1. El usuario entra por el engranaje del perfil → Ajustes → Apariencia.
2. Toca una de las tres tarjetas: se aplica al instante en toda la página (cambiar `data-theme` en `<html>`) y se guarda en `profiles.theme` con una server action.
3. El interruptor “Automático según el sistema” guarda `theme = 'auto'`: se usa Aurora clara o nocturna según `prefers-color-scheme`. Al activarlo, si estaba en Estreno, pasa a Aurora.
4. El layout del servidor lee `profiles.theme` y escribe `data-theme` en el `<html>` antes de renderizar, para evitar el parpadeo. Sin sesión: cookie `theme`, y por defecto Aurora nocturna.
5. El botón de sol/luna actual de la barra se elimina: el tema vive en Ajustes.

## Card de anime

Una sola card (`AnimeCard`) para Catálogo, Listas, Inicio, Calendario y búsqueda. Cada zona hace una sola cosa, y nada depende del hover, así funciona igual en el celular. Se eliminan el botón + y el modal “Add to List” como entrada desde la card.

| Zona | Acción | Resultado |
| --- | --- | --- |
| Póster y título | Clic | Abre la ficha |
| ♥ arriba a la derecha | Clic | Alterna Me encanta (optimista, revierte si falla) |
| Pill de estado bajo el título | Clic | Abre el menú de estados |
| Contador “EP 8/12 +1” | Clic en +1 | Suma un episodio |
| Badge arriba a la izquierda | — | “En emisión” o “Próximo estreno” |
| Barra fina al pie del póster | — | Progreso, solo en Viendo y En pausa |

### Cambiar el estado desde la card

1. La pill muestra el estado actual con su color. Sin estado muestra “Agregar” con borde punteado.
2. Clic en la pill → menú con los cinco estados (el actual marcado), un separador, “Guardar en lista…” y, si tiene estado, “Quitar de mi biblioteca”.
3. Elegir un estado lo guarda al instante (optimista) y cierra el menú. Se aplican las reglas de la sección Conceptos.
4. “Guardar en lista…” abre el selector de listas (ver Listas).
5. El menú se cierra con Escape o clic afuera; se navega con flechas y Enter.

### Contador +1

- Visible solo con estado Viendo.
- Cada clic suma 1 y guarda con debounce de 600 ms (varios clics seguidos = una sola escritura).
- Al llegar al total pasa a Completado y muestra un aviso con “Deshacer”.
- Sin total conocido (serie en emisión sin episodios anunciados) muestra solo “EP 8”.

### Selección múltiple

Pensada para cargar muchas series de golpe (por ejemplo, 200 completadas).

1. Botón “Seleccionar varias” arriba de cualquier grilla.
2. En modo selección, cada card muestra una casilla y el clic en el póster selecciona en vez de abrir la ficha. Aparece “Seleccionar todas” (las visibles con los filtros actuales) y “Salir”.
3. Barra flotante abajo: “N seleccionadas · Marcar como: Completado · Viendo · Pendiente · Guardar en lista”.
4. La acción se aplica en una sola server action por lote (`bulkSetStatus(ids, status)`), con aviso de resultado y “Deshacer”.
5. Salir del modo limpia la selección.

Antes que la selección múltiple, el camino para quien viene de otra app es el importador de MyAnimeList y AniList que ya existe; se muestra en Inicio y en el perfil cuando la biblioteca está vacía.

## Filtros

Un único componente `FilterBar` reemplaza los sidebars de 12 acordeones (`CatalogFilterPanel`, `LibraryCatalogFilters`, `LibraryFilterBar`). Se usa en Catálogo, en cada lista y en la biblioteca, y su definición también alimenta las listas inteligentes.

**Estructura (de izquierda a derecha):**

1. Campo “Filtrar por título” (debounce 300 ms).
2. Desplegables rápidos: Género, Año, Temporada, Formato, Estado de la obra. Cada uno abre un popover; si tiene algo elegido se pinta con el color primario y muestra el resumen (“Género · 2”, “Año · 2020–2025”).
3. “Más filtros” abre un panel lateral (hoja inferior en celular) con el resto: excluir géneros, puntuación, mis etiquetas, tipo.
4. “Orden” a la derecha: Popularidad, Puntuación, Más recientes, Título A–Z; en listas también “Prioridad (manual)” y “Agregado recientemente”.

**Segunda fila:** un chip por filtro activo con ✕ para quitarlo, “Limpiar” y el interruptor “Ocultar los que ya están en mi biblioteca” (solo en Catálogo).

Reglas:

- El estado de los filtros vive en la URL (`?genres=fantasy&year=2020-2025&sort=score`), así se pueden compartir y el botón Atrás funciona.
- Las opciones que no aplican a la pantalla no se muestran (ej.: “Estado de la obra” sí, “Mis etiquetas” solo en listas).
- En listas los filtros corren en el cliente sobre los ítems ya cargados; en Catálogo se mandan a AniList/MAL como hoy.
- La línea “Datos de AniList · cambiar a MyAnimeList” reemplaza el bloque “Motor de búsqueda”.
- Debajo de la barra: cantidad de resultados y “Seleccionar varias”.

## Listas

`/lists` tiene una columna lateral fija y el contenido de la lista elegida a la derecha. En celular la columna pasa a ser un selector arriba.

**Columna lateral:**

- Botón “Nueva lista”.
- **Biblioteca:** Viendo, Pendientes, Completadas, En pausa, Abandonadas, con cantidad. Son vistas fijas filtradas por estado, no listas editables.
- **Mis listas:** Me encanta (siempre primera, no se puede borrar) y las listas creadas por el usuario.
- **De amigos:** listas que sigue (ver Compartir) y la Bandeja de recomendaciones con su contador.

### Tipos de lista

| Tipo | Comportamiento |
| --- | --- |
| Colección | Libre, sin orden especial |
| Maratón | Ordenada; muestra “lo próximo” en Inicio y el tiempo restante; al completar uno sube el siguiente |
| Inteligente | Se llena sola con reglas guardadas con la misma definición de `FilterBar`; no admite agregar a mano |
| Compartida | Varios amigos agregan y ordenan (coedición) |
| Recomendaciones | Un amigo agrega títulos con nota; el dueño los ordena |

### Crear una lista

Hay tres puntos de entrada:

1. **Desde Listas:** “Nueva lista” abre un modal: nombre (obligatorio, hasta 60 caracteres), tipo (cinco tarjetas con su descripción), descripción opcional y privacidad (por defecto Privada). Al crear, la lista se abre vacía con un estado vacío que invita a “Explorar el catálogo”.
2. **Desde una card o la ficha:** “Guardar en lista…” abre un popover con buscador, las listas con casilla (marcar o desmarcar guarda al instante, sin botón Guardar) y al pie “Nueva lista con este título”, que crea una Colección con ese nombre y el título adentro.
3. **Desde una lista compartida:** “Hacer una copia” (ver Compartir).

Si el usuario elige Inteligente en el modal, aparece el paso “Reglas” con la misma `FilterBar` y una vista previa de cuántos títulos coinciden.

### Vista de una lista

- **Encabezado:** portada automática con los tres primeros pósters, tipo, nombre, cantidad de títulos, vistos y horas restantes (episodios restantes × duración), barra de progreso.
- **Acciones:** “¿Qué veo hoy?”, Compartir, menú ⋯ (editar nombre y descripción, cambiar tipo, borrar con confirmación en la propia página).
- **Contenido:** vista en filas (por defecto) o en grilla. Las filas muestran número, póster, título, nota, estado, progreso y duración. En Maratón y Recomendaciones se reordena arrastrando (con alternativa de teclado “Subir/Bajar”).
- **Notas por título:** texto corto (hasta 140 caracteres) que escribe el dueño, o el amigo en Recomendaciones.
- **Ruleta “¿Qué veo hoy?”:** elige al azar entre los títulos de la lista con estado Pendiente o sin estado, y muestra un panel con “Empezar EP 1” (pone Viendo, episodio 1) y “Tirar de nuevo”. Sin candidatos, el botón se deshabilita con el motivo.

## Compartir listas

Compartir por link deja que otros vean y guarden una lista; no es lo mismo que una lista Compartida, donde varios editan.

&#91;embedded content: compartir una lista · del dueño al amigo\]

El dueño comparte desde su lista; quien abre el link sigue o copia la lista, y si no tiene cuenta, la sigue al terminar de registrarse.

### Cómo se llega al panel de compartir

1. Listas → elegir una lista propia en la columna lateral.
2. En el encabezado de la lista, botón de compartir (ícono de nodos) junto a “¿Qué veo hoy?”.
3. Se abre el panel “Compartir lista” (popover en escritorio, hoja inferior en celular).

Otros accesos al mismo panel: menú ⋯ de la lista → “Compartir”, y en el perfil público, el menú de cada lista pública. La lista “Me encanta” y las vistas de la Biblioteca no se comparten por link (el Top del perfil ya cumple ese rol).

### Panel “Compartir lista”

1. **Quién puede verla** (radio): Privada · Cualquiera con el link · Pública en mi perfil.
2. Con link o pública: campo de solo lectura con `…/l/<shareSlug>` y botón “Copiar link”, que cambia a “Copiado” por 2 segundos. Si el navegador no permite copiar, se selecciona el texto.
3. Debajo: quiénes la siguen (avatares + nombres) y cuántas copias se hicieron.
4. Privada: no hay link. Volverla privada desactiva el link existente y quienes la seguían dejan de verla (se les muestra “Esta lista ya no está disponible”).
5. El `shareSlug` se crea la primera vez que se elige link o pública (nombre en minúsculas + 4 caracteres al azar) y no cambia si se renombra la lista.

### Vista previa en chats

`/l/[shareSlug]` expone metadatos Open Graph: título “\<nombre de la lista> · AniTrack”, descripción “\<N> títulos · lista de \<usuario>” e imagen generada con `opengraph-image` (fondo aurora + los tres primeros pósters). Solo para listas con link o públicas.

### Página pública de la lista

La ve cualquiera con el link:

- **Encabezado:** portada, “Lista de \<dueño> · \<tipo>”, nombre, descripción, cantidad y horas. Si quien mira está logueado: “Ya viste X de N” con barra.
- **Acciones:** “Seguir lista” (pasa a “Siguiendo”, clic de nuevo para dejar de seguir), “Hacer una copia”, Compartir. Una línea explica la diferencia.
- **Cards:** muestran el estado de **quien mira**, no el del dueño. Puede cambiar estado y usar +1 desde ahí.
- **Seguir:** guarda una fila en `list_follows`; la lista aparece en Listas › De amigos y se actualiza sola. Aviso: “Siguiendo… La encontrás en Listas › De amigos”.
- **Hacer una copia:** crea una lista nueva del usuario con los mismos títulos y orden, privada, nombre “\<nombre> (copia)” y `copied_from_list_id`. Muestra “Basada en la lista de \<dueño>” en su encabezado. Las notas no se copian.
- **Sin sesión:** ve la lista completa; “Guardar lista” lleva a registrarse o iniciar sesión con `?next=/l/<slug>&action=follow` y al volver ejecuta el seguimiento.
- **El dueño** que abre su propio link ve la página con un aviso “Así la ven los demás” y un botón para volver a editarla.

## Recomendaciones entre amigos

Un amigo le manda un título a otro con una nota; llega a una bandeja y el receptor decide dónde guardarlo.

1. En la ficha, botón “Recomendar a un amigo” → popover con la lista de amigos (solo amistades aceptadas), un campo de nota opcional (hasta 140 caracteres) y “Enviar”.
2. Se crea una fila en `recommendations` con estado pendiente. El receptor ve el contador en Listas › Bandeja y la tarjeta en Inicio (“Te recomendaron”).
3. Cada recomendación muestra avatar, nombre, título, póster y nota, con dos acciones:
   - **Guardar en lista:** abre el selector de listas; por defecto propone la lista de Recomendaciones de ese amigo (“Recomendados por Fede”) y la crea si no existe.
   - **Descartar:** la marca como descartada; el emisor no recibe aviso.
4. Al guardarla, la nota viaja con el título y se muestra en la columna “Nota de \<amigo>” de la lista.
5. No se puede recomendar dos veces el mismo título a la misma persona mientras haya una recomendación pendiente.

## Calendario

El calendario pasa de una grilla de pósters por día a una semana con horarios en la zona del usuario.

- **Datos:** sumar `nextAiringEpisode { airingAt episode }` y `airingSchedule(notYetAired: true)` a la consulta de temporada de AniList (`season-schedule.ts`). `airingAt` es un timestamp Unix en UTC. Si AniList falla y se usa MAL, convertir `broadcast.start_time` (hora de Japón, UTC+9).
- **Zona horaria:** la del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`), guardada en el perfil para el servidor. Se muestra la leyenda “Horarios en hora de Buenos Aires (UTC−3)”.
- **Vista:** siete columnas lunes a domingo, la de hoy resaltada con una línea “ahora”. Cada emisión es una tarjeta con hora, título, episodio y una franja del color de su estado. En celular, un día por vez con pestañas.
- **“Lo que sigo” / “Toda la temporada · N”:** reemplaza “Todos / Mis favoritos”. “Lo que sigo” = títulos de la biblioteca con estado Viendo, Pendiente o En pausa que están en emisión.
- **Navegación:** semana anterior, “Esta semana”, semana siguiente. El selector de año y temporada pasa a “Toda la temporada”.
- **Próximo episodio:** panel arriba a la derecha con el próximo de “Lo que sigo” y cuenta regresiva en horas y minutos (se actualiza cada minuto).
- **Episodio ya emitido y sin ver:** su tarjeta muestra “Marcar visto”, que suma +1 en la biblioteca.

## Inicio, ficha, perfil y ajustes

### Inicio (logueado)

1. Saludo con la fecha y “Tenés N episodios nuevos” (episodios emitidos posteriores al progreso del usuario).
2. **Seguir viendo:** títulos en Viendo ordenados por último episodio emitido; cada fila con póster, aviso (“EP 9 salió a las 11:00” o “Sale en 2 h 10 min”), progreso y botón “Vi el EP N” (= +1). Si está al día, el botón dice “Al día” y queda inactivo.
3. **Hoy** (columna derecha): emisiones del día de “Lo que sigo” con hora y línea “ahora”; enlace al calendario.
4. **Tu semana:** episodios vistos, horas y títulos completados en los últimos 7 días (requiere registrar fecha en cada cambio de progreso).
5. **Te recomendaron:** las últimas tres de la Bandeja.
6. **Lo que viene** y **Top de todos los tiempos:** se mantienen con el nuevo estilo.

Deslogueado: igual que hoy, con el nuevo estilo, y la tarjeta de inicio de sesión menciona el importador de MAL y AniList.

### Ficha de anime o manga

- **Barra de acciones:** pill de estado (mismo menú que la card), contador − EP n/total +, “Me encanta”, “En N listas” (abre el selector de listas, que guarda al tocar), “Recomendar a un amigo”.
- Se eliminan el botón “Añadir a favoritos” con desplegable y el campo EP suelto.
- **Próximo episodio:** panel con fecha y hora local del próximo episodio y “Vi el EP N” si hay uno emitido sin ver.
- **Columna derecha:** detalles, “De la misma historia” (temporadas y obra original con el estado del usuario) y “Amigos que la vieron” (progreso y puntaje de amigos).

### Perfil público (`/users/[username]`)

- Banner aurora, avatar, nombre, usuario, biografía. Si es el propio: “Editar perfil” y el engranaje a Ajustes.
- Pestañas: Resumen, Listas públicas, Amigos, Actividad.
- Resumen: estadísticas (completadas, horas, episodios, puntaje promedio), **Mi top** (los ♥ ordenables arrastrando, máximo 10 visibles), géneros más vistos (barra de proporciones), listas públicas, “Viendo ahora”.
- La privacidad de cada bloque se respeta según Ajustes › Privacidad.

### Ajustes (`/settings/[section]`)

Todo lo que hoy está mezclado en `/profile` pasa aquí, con menú lateral: Perfil y biografía · Apariencia (temas) · Privacidad · Cuentas conectadas (MAL, AniList) · Contenido adulto. Cada sección guarda por separado con su propio botón y aviso de confirmación.

## Base de datos y server actions

Se parte de las tablas actuales (`media`, `favorites`, `user_media_progress`, `lists`, `list_media`, `profiles`). Cada cambio necesita su política RLS en Supabase.

| Tabla | Cambio | Para qué |
| --- | --- | --- |
| `favorites` | Renombrar a `library_entries` (o crear una vista con ese nombre) | Biblioteca: un título con estado |
| `user_media_progress` | Sumar `updated_at`; registrar cada cambio en `progress_events (user_id, media_id, episode, at)` | +1 con deshacer, “Tu semana” |
| `loves` (nueva) | `user_id`, `media_id`, `position`, `created_at` | Me encanta y orden del Top |
| `lists` | Sumar `kind` (`collection, marathon, smart, shared, recommendations`), `description`, `visibility` (`private, link, public`), `share_slug` único, `rules jsonb`, `copied_from_list_id`, `friend_id` | Tipos, compartir, copias, listas de un amigo |
| `list_media` | Sumar `position`, `note`, `added_by` | Orden manual, notas, quién agregó |
| `list_follows` (nueva) | `user_id`, `list_id`, `created_at` | Seguir listas |
| `list_members` (nueva) | `list_id`, `user_id`, `role` | Listas compartidas (coedición) |
| `recommendations` (nueva) | `from_user`, `to_user`, `media_id`, `note`, `status` (`pending, saved, dismissed`), `created_at` | Bandeja |
| `profiles` | Sumar `theme` (`aurora-nocturna, aurora-clara, estreno, auto`), `timezone` | Temas, calendario |

**Server actions** (en `lib/actions/`):

- Biblioteca: `setStatus(mediaId, status | null)`, `bumpEpisode(mediaId, delta)`, `bulkSetStatus(mediaIds, status)`, `undoLast(eventId)`.
- Me encanta: `toggleLove(mediaId)`, `reorderLoves(ids)`.
- Listas: `createList(input)`, `updateList(id, patch)`, `deleteList(id)`, `toggleListItem(listId, mediaId)`, `reorderList(listId, ids)`, `setItemNote(listId, mediaId, note)`.
- Compartir: `setListVisibility(id, visibility)` (crea `share_slug` si falta), `followList(slug)`, `unfollowList(listId)`, `copyList(slug)`.
- Amigos: `sendRecommendation(toUser, mediaId, note)`, `resolveRecommendation(id, 'saved' | 'dismissed', listId?)`.
- Ajustes: `setTheme(theme)`, `setTimezone(tz)`.

Toda escritura desde la card es optimista: la interfaz cambia al instante y vuelve atrás con un aviso de error si la action falla.

## Orden de implementación

Cada fase deja el sitio usable; conviene publicar al terminar cada una.

1. **Base visual:** `temas.css`, tipografías, logo, barra superior nueva, textos en español. Sin cambios de datos.
2. **Conceptos y card:** `library_entries` + `loves`, nueva `AnimeCard` con menú de estado, +1 y ♥; selección múltiple; importador visible.
3. **Filtros:** `FilterBar` única en Catálogo y Biblioteca; estado en la URL.
4. **Listas:** columna lateral, tipos, crear lista, selector “Guardar en lista”, vista con orden, notas y ruleta.
5. **Compartir:** visibilidad y `share_slug`, panel, `/l/[slug]` con Open Graph, seguir y copiar.
6. **Calendario:** horarios desde AniList, semana con “ahora”, “Lo que sigo”, próximo episodio.
7. **Social y ajustes:** recomendaciones y Bandeja, Inicio nuevo, perfil público, `/settings` con temas.

Pendiente de decidir: si las listas Compartidas (coedición) entran en la fase 4 o se postergan, porque requieren permisos por miembro.
