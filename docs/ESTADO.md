# Estado de AniTrack y continuidad entre chats

### Imágenes sin transformaciones de Vercel · 11 de noviembre de 2026

`next.config.ts` activa `images.unoptimized: true` para evitar que las portadas dejen de cargar al agotar la cuota de Image Optimization de Vercel. `next/image` conserva sus componentes, dimensiones y carga diferida configurada, pero entrega la URL original sin redimensionar, recomprimir ni convertir el formato. El peso de descarga depende del archivo de origen. El README explica esta decisión y la necesidad de un nuevo despliegue.

Pasaron ESLint enfocado, TypeScript y `pnpm build --webpack`; el artefacto de producción conserva `images.unoptimized: true`. Una comprobación con la configuración real y el generador de props de Next.js verificó URL original, ausencia de `srcSet` del optimizador y carga diferida para AniList, MyAnimeList y un recurso local. En Chrome, sobre el build local y sin sesión, el catálogo mostró portadas reales de AniList a 1440 px y 390 px, sin desborde horizontal y con cero solicitudes a `/_next/image`. Pendiente desplegar y comprobar las imágenes en producción; esta entrega no modifica el sitio publicado.

### Llamados de catálogo y ficha · 9 de noviembre de 2026

La ficha de anime pide los seis personajes principales en el mismo `Detail` de AniList que usan los metadatos, el banner y los animes relacionados. Si falla la lectura de manga y novelas desde MyAnimeList, la ficha reutiliza las relaciones de esa misma respuesta. Esto baja de dos a una las lecturas normales a AniList por ficha fría y elimina la tercera consulta que podía hacer el respaldo. «Ver todos» sigue cargando su reparto paginado. El navbar solo pide sugerencias mientras están abiertas. El inventario de endpoints y casos que cambian el total está en [guardado y sincronización](guardado-local-y-sincronizacion.md#solicitudes).

Pasaron ESLint enfocado, TypeScript, el build con webpack y 15 pruebas de relaciones, filtros, progreso y sincronización. Una consulta real a AniList confirmó los personajes y las relaciones de la operación agrupada. En el build local con proveedores simulados, las cuatro rutas hicieron una llamada a AniList en frío con AniList seleccionado y ambas fichas hicieron cero al repetirlas con caché fresca. Se verificó el respaldo con MyAnimeList respondiendo 503 y el conteo de las fichas con MyAnimeList seleccionado. En Chrome, la ficha mostró personajes y lecturas, el buscador móvil esperó al envío y en escritorio Escape canceló la sugerencia pendiente. Queda pendiente contrastar los logs del despliegue si reaparece el 429. El wrapper existente registra proveedor, operación, estado, cuota restante y espera indicada cuando falla una consulta.

### Foto y portada del perfil · 8 de noviembre de 2026

En Ajustes → Perfil y biografía se puede previsualizar, guardar, reemplazar o quitar cada imagen. Se aceptan JPG, PNG y WebP de hasta 4 MB y 24 megapíxeles. El servidor corrige la orientación, aplica un recorte centrado, quita los metadatos y guarda WebP. Los máximos son 320 × 320 y 80 KiB para la foto, y 1440 × 480 y 240 KiB para la portada. Al quitar una imagen, se recupera el avatar anterior o las iniciales y el banner aurora según corresponda.

Aplicar [`202611080002_profile_images.sql`](../supabase/migrations/202611080002_profile_images.sql) en el proyecto Supabase antes de habilitar las subidas. La migración crea un bucket público de imágenes de perfil. Conservar deshabilitado su versionado. Cada cuenta ocupa como máximo dos objetos activos, `<uid>/avatar.webp` y `<uid>/cover.webp`. El servidor valida sesión y origen y usa `SUPABASE_SERVICE_ROLE_KEY` para escribir. La política restringe las escrituras y la enumeración directa del bucket. Las imágenes se pueden leer por URL para mostrarlas en los perfiles públicos.

El reemplazo escribe en la misma ruta con `upsert` después de validar y optimizar. Supabase se encarga de retirar los bytes anteriores al confirmar la nueva imagen. La lectura usa la revisión de Storage en la URL y una caché de navegador breve, sin escribir una referencia separada en `profiles`. La migración queda pendiente en el Supabase remoto.

Pasaron ESLint, TypeScript, el build con webpack y las pruebas de conversión, tamaño y permisos con PGlite. Con Storage simulado, las pruebas HTTP comprobaron sesión, origen, formatos, reemplazos en los mismos dos objetos, conservación del archivo ante un fallo y borrado idempotente. En Chrome se verificaron la vista previa y el guardado a 390 px, las dos imágenes cargadas en el perfil público de escritorio y el regreso del banner aurora al quitar la portada. Queda pendiente probar una subida con una cuenta real después de aplicar la migración.

### Perfil social · 8 de noviembre de 2026

`/profile` y `/users/[username]` comparten la composición de la pantalla 13. El banner aurora por defecto tiene el degradado y los 180 px de la referencia. El encabezado usa el avatar guardado o iniciales, nombre, usuario y biografía. La fecha de alta se muestra al titular desde Auth. Editar perfil y el engranaje abren los ajustes existentes.

Las pestañas Resumen, Listas públicas, Amigos y Actividad conservan la selección en la URL. «Mi top» muestra hasta diez anime, diez manga y diez personajes por separado, con el orden del editor existente y la privacidad de cada categoría. Se retiraron los bloques de favoritos de biblioteca y de lectura del perfil. La pestaña de listas solo enumera colecciones con visibilidad `public`, con vista previa de tres en Resumen y doce por página en la pestaña. Amigos muestra las amistades aceptadas al titular. Actividad informa que el historial todavía no está disponible.

«Viendo ahora» muestra hasta tres anime en curso. Prioriza coincidencias de año y temporada guardadas en `media` y luego el progreso actualizado más recientemente. Resumen agrega completadas, episodios registrados y hasta cinco géneros con progreso. Las horas vistas y el puntaje personal quedan sin valor hasta disponer de esos datos. La migración `202611080001_visible_profile_anime_summary.sql` proyecta estas métricas y los tres títulos mediante la privacidad existente de la biblioteca. Está preparada y probada en PostgreSQL embebido. Falta aplicarla en Supabase y verificar la vista con cuentas reales. Mientras tanto, el titular obtiene el resumen con una lectura autorizada de su propio progreso.

Pasaron ESLint enfocado, TypeScript, `pnpm build --webpack` y 18 comprobaciones de privacidad de perfil, listas y temas. En Chrome con datos simulados se revisaron los tres temas, escritorio y móvil de 390 px sin desborde horizontal, foco y navegación con teclado, paginación de listas, redirección sin sesión y las vistas propia, pública y con biblioteca privada.

### Ajustes → Preferencias · 8 de noviembre de 2026

`/settings/preferences` reúne Hora del calendario y Fuente de búsqueda. «Ajustar hora» en el calendario lleva directamente a su control. La zona explícita o automática sigue usando el mismo guardado en Supabase con sesión y la cookie de calendario. Sin sesión se puede guardar la zona en el navegador. Se retiró ese formulario de Mi perfil.

El selector de fuente reutiliza la cookie `catalog-provider` y respeta la elección anterior. El catálogo y el buscador del navbar usan AniList o MyAnimeList para anime, manga y personajes, según las integraciones existentes. El cambio actualiza las sugerencias del navbar y conserva los accesos rápidos para cambiar de fuente desde el catálogo. La preferencia de fuente se guarda por navegador y es independiente de las cuentas conectadas y la sincronización de bibliotecas.

Pasaron ESLint enfocado, TypeScript, el build con webpack y seis pruebas existentes de calendario y navegación de filtros. En Chrome sin sesión se comprobaron escritorio claro y móvil oscuro de 390 px sin desborde, la zona de Tokio aplicada en Calendario, el regreso a automático, la persistencia al recargar y las respuestas reales de ambos proveedores. El buscador descarta las sugerencias anteriores al cambiar de fuente. Una fuente inválida muestra un error y conserva la preferencia. Queda pendiente comprobar el guardado de la zona con sesión real.


### Ajustes de cuenta · 8 de noviembre de 2026

El panel de Ajustes navega a cuatro páginas con sesión. «Perfil y biografía» contiene usuario, biografía, visibilidad en búsquedas y solicitudes de amistad. «Privacidad» concentra los permisos de biblioteca y destacados. «Contenido adulto» guarda el mismo indicador que controla Hentai y confirma el resultado antes de actualizar el interruptor. «Cuentas conectadas» contiene las tarjetas de AniList y MyAnimeList, con sus acciones y avisos. Mi perfil conserva la hora del calendario y ofrece un acceso a editar el perfil social.

Los retornos de OAuth y desconexión desde Ajustes van a `/settings/connections`. Los flujos de biblioteca conservan el retorno `/favorites`, que reenvía los avisos a `/lists`. La ruta de retorno solo permite destinos locales conocidos. Las páginas verifican sesión antes de leer datos y siguen usando los servicios y acciones existentes. El traslado no requiere migraciones ni cambios de configuración OAuth.

Pasaron ESLint enfocado, TypeScript, `pnpm build --webpack` y las pruebas existentes de tema. En navegador sin sesión se comprobó la navegación de Ajustes y que las cuatro secciones privadas derivan al acceso. Las comprobaciones con servicios simulados cubrieron guardado de contenido adulto, fallo, sesión ausente, revalidación y destinos de desconexión de ambos proveedores. Queda pendiente revisar los formularios en navegador con sesión y completar una conexión OAuth real.


### Ajustes → Apariencia · 8 de noviembre de 2026

Nueva ruta `/settings/appearance`, con redirección desde `/settings`, panel de secciones y composición de las pantallas 03–05: tres tarjetas, automático y muestras de Seguir viendo, cards, estados, botones y etiquetas. Las muestras son estáticas y conservan las portadas neutras del HTML; no representan la biblioteca ni ejecutan acciones. Se usan Unbounded y JetBrains Mono en esta pantalla, y Barlow Condensed para títulos de Estreno. Se conserva el contenedor compartido del sitio. En móvil, el panel pasa arriba y las opciones se apilan.

El menú del avatar incluye Ajustes y se retiró el botón sol/luna. Sin sesión hay un acceso de engranaje. Perfil, Privacidad, Cuentas conectadas y Contenido adulto enlazan a anclas verificables de la configuración actual en `/profile`; todavía no se trasladaron sus formularios. Apariencia es pública porque solo modifica una preferencia de navegador.

La elección aplica `data-theme` y mantiene `.dark` para compatibilidad. Cookie y localStorage conservan las elecciones anteriores `dark`/`light`; la cookie permite resolver temas explícitos en servidor. Automático sigue `prefers-color-scheme` en el arranque y ante cambios del sistema; un listener global actualiza también otras pestañas. El script previo al render conserva la excepción de hidratación que ya existía en el elemento raíz. No se agregó una excepción nueva. Estreno incorpora la paleta global y títulos condensados; los radios de los componentes antiguos que tienen valores fijos se migrarán con sus pantallas.

**Alcance de persistencia:** se guarda en este navegador, como indica la interfaz. No se implementó `profiles.theme` ni sincronización entre dispositivos; requieren una fase de datos independiente. Sin cookies, se aplica el tema y aparece un aviso de guardado fallido. No cambiaron permisos, biblioteca, proveedores ni esquema.

**Verificación:** ESLint enfocado, TypeScript y dos pruebas de compatibilidad/resolución aprobados. Navegador sin sesión: tres temas, escritorio de 1440 px y móvil de 390 px sin desborde; selección con flechas y foco visible; automático al alternar el esquema del sistema; Estreno conservado tras recargar. Se corrigieron los contrastes de +1 y Me encanta de las muestras. El servidor de desarrollo requirió reinicio y regeneración de tipos porque no reconocía la ruta nueva y sus archivos generados eran inválidos. Build de producción con `pnpm build --webpack` aprobado, con ambas rutas de Ajustes incluidas. Pendientes: acceso desde avatar con sesión real, fallo de cookies en navegador y futura persistencia en cuenta. Próximo paso: revisión visual del usuario y traslado gradual de las demás secciones de Ajustes.


### Puntaje de IMDb en la ficha · 8 de noviembre de 2026

La ficha ahora usa el ID IMDb del enlace para buscar el puntaje en `title.ratings.tsv.gz`, el archivo oficial para uso personal y no comercial. El servidor descomprime el archivo en flujo y guarda en caché durante un día los puntajes de títulos presentes en el índice de equivalencias. La consulta se carga por separado del encabezado. La nota se acompaña de la atribución de IMDb. Si falta la equivalencia o el puntaje, o si falla la descarga, se muestra — y se conserva el enlace cuando existe. [Datos oficiales de IMDb](https://developer.imdb.com/non-commercial-datasets/).

Se verificó `tt1355642` con una nota real de 9,1 en la ficha de Fullmetal Alchemist: Brotherhood, en escritorio oscuro y móvil claro sin desborde. Pasaron ESLint enfocado, TypeScript, build de producción con webpack y dos pruebas de lectura del gzip, ID exacto, concurrencia, datos inválidos y recuperación tras un error. Para habilitar el cambio en el sitio publicado hace falta desplegar esta versión.


### Contador y animes relacionados · 8 de noviembre de 2026

La ficha incorpora − / EP x/x / +, con entrada numérica directa y objetivos táctiles de 44 px. El componente compartido también muestra CAP para manga. Los cambios se agrupan tras 600 ms; solo se envía una escritura por vez y las ediciones durante una solicitud esperan la revisión devuelta. El contador usa `saveLibraryEditor`: actualiza únicamente progreso con sesión, límites y control de `updated_at`, preservando notas y asociaciones de listas. Al bajar desde Completado pasa a Viendo/Leyendo; alcanzar el total completa mediante la acción existente. Un fallo conserva el borrador, detiene el envío automático y ofrece Reintentar. Sin sesión abre el acceso; sin registro personal se pide elegir un estado primero. Estado, favoritos y modal de listas esperan mientras haya un cambio del contador pendiente. Los borradores viven en esta ficha, no se persisten entre navegaciones; cerrar/recargar el documento con cambios pendientes activa el aviso del navegador.

Animes relacionados aparece antes de Manga y novelas relacionados. Se agregaron las relaciones a la consulta de detalle de AniList ya memoizada, sin una consulta por tarjeta. Solo se enlazan anime con ID MAL positivo, único y distinto del actual. La tarjeta indica formato y relación traducidos. El progreso se consulta por tandas de hasta 100 ID MAL, filtro de tipo anime y usuario autenticado, con el cliente sujeto a RLS y sin caché compartida de datos personales. El estado se muestra en una etiqueta primary con texto y símbolo (✓ Completado). Si falla la consulta personal se conservan los títulos y se avisa; sin relaciones se omite la sección. No hubo migraciones ni escrituras a proveedores.

Validación: 14 pruebas aprobadas entre contador, relaciones y acciones del editor (debounce, cambios en vuelo, revisión, errores, límites, identidad MAL, filtrado por usuario y ausencia de sesión). ESLint enfocado, TypeScript y build de producción con webpack aprobados. Navegador con Fullmetal Alchemist: Brotherhood: OVA, película, versión alternativa y especiales antes del manga; escritorio oscuro de 1440 px y móvil claro de 390 px, sin desborde, foco de teclado, acceso desde + y cierre con Escape. Las escrituras y etiquetas con una cuenta real, así como la UI de manga, quedan pendientes de verificación. El flujo de estado/listas anterior sigue siendo independiente del nuevo guardado del contador.


### Ficha de anime · 7 de noviembre de 2026

`/anime/[slug]` incorpora la composición de la pantalla 12: póster y encabezado con Unbounded, puntajes con JetBrains Mono, sinopsis y personajes a la izquierda, detalles y nombres completos a la derecha. Conserva fechas, duración, estudios, origen, ranking, sinónimos, lecturas relacionadas y recomendaciones. Los géneros reutilizan las traducciones del catálogo. Manga mantiene su vista anterior.

AniList aporta `bannerImage` en la consulta existente de detalle. La imagen se recorta en horizontal; ante ausencia, error o proporción menor a 1,4 se usa un fondo de aurora con el título japonés grande y líneas sutiles. Se limita la URL del banner al dominio de imágenes permitido. El enriquecimiento consulta el otro proveedor para mostrar AniList y MAL por separado, sobre 10, con caché existente y fallos opcionales aislados. Con MAL seleccionado se obtiene también el banner de AniList. IMDb conserva el enlace por equivalencia existente, pero muestra —: todavía no hay una fuente de puntajes integrada. No se inventan notas ni se agrega puntuación personal. Referencias: [Media de AniList](https://docs.anilist.co/reference/object/media) y [datasets de IMDb](https://developer.imdb.com/non-commercial-datasets/).

Los controles personales reutilizan el flujo actual, incluidos favoritos, progreso y modal de listas. No se implementaron Me encanta independiente, recomendaciones a amigos ni el popover nuevo de listas; requieren su fase funcional. No cambiaron permisos, esquema ni sincronización.

El modal de agregar a una lista usa el fondo opaco del tema en toda su superficie. Se verificó el componente con datos de prueba en Chrome a 390 y 1440 px en los tres temas.

Validación: ESLint enfocado, TypeScript y build de producción con webpack aprobados. Inspección en navegador con datos reales de Fullmetal Alchemist: Brotherhood, sin sesión, en escritorio de 1440 px y móvil de 390 px, ambos temas, banner y alternativa tipográfica; se corrigió el desborde del fondo y se comprobó el ancho móvil sin scroll horizontal. Menú de estados con teclado, Escape y retorno de foco; apertura y cierre del acceso desde la acción personal. No se probaron escrituras con cuenta real, fallos remotos completos ni el detalle con MAL como proveedor principal. Próximo paso: revisar el diseño con el usuario y definir la fuente de puntajes IMDb antes de integrarla.


### Recuperación de contraseña · 7 de noviembre de 2026

«¿Olvidaste tu contraseña?» abre la solicitud desde el modal o la página de acceso. Supabase emite el enlace con PKCE. El callback dedicado valida el intercambio y registra un marcador HTTP-only de 15 minutos vinculado a la sesión verificada. El formulario y la acción de cambio comprueban ese vínculo. Al guardar, se elimina el marcador y se vuelve al acceso. La solicitud usa la misma respuesta pública para cuentas existentes, inexistentes o rechazos del envío.

Falta habilitar o verificar SMTP para destinatarios externos y permitir `/auth/recovery` en las URL de retorno de Supabase. Desactivar la confirmación de altas no elimina esta dependencia. El README registra los callbacks y la plantilla requerida. La entrega real del correo queda pendiente.

Pasaron ESLint, TypeScript, build con webpack y cuatro pruebas de recuperación. En Chrome con Auth simulado se comprobó la solicitud, el intercambio PKCE, la conservación del host al volver, el formulario móvil sin desborde y el guardado con retorno a login. Una sesión sin marcador o con otro identificador no puede cambiar la contraseña por este flujo.

### Confirmación por correo en el registro · 7 de noviembre de 2026

El endpoint de configuración de Auth del proyecto confirmó que el registro con correo está habilitado y requiere confirmación (`mailer_autoconfirm: false`). El modal y `/register` ahora distinguen sesión activa, confirmación pendiente y errores de Supabase. El registro de página usa el callback del origen de la solicitud, que debe estar permitido en Supabase. Se conservó la política de confirmación.

La configuración pública no muestra el proveedor SMTP ni el resultado de entrega. Para diagnosticar una dirección concreta, revisar Authentication → Users y Auth Logs. Si se usa el SMTP integrado, Supabase restringe el envío a direcciones del equipo. Para cuentas externas con confirmación, configurar un proveedor SMTP propio. [Guía de SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

Pasaron ESLint, TypeScript y el build con webpack. Se probaron seis respuestas simuladas entre el modal y la acción de registro, con sesión, confirmación pendiente, destinatario rechazado y límite de envío. Chrome mostró el aviso en escritorio y móvil sin desborde. La entrega de un correo real queda por verificar.

### Vista de lista compartida y De amigos · 7 de noviembre de 2026

La vista `/l/[shareSlug]` sigue la composición de la pantalla 10 con tres portadas, encabezado de autor, acciones, grilla numerada y panel lateral según la sesión. Las tarjetas muestran formato, episodios o capítulos disponibles y progreso personal con guardado por revisión. El resumen de progreso es por página en listas de más de 24 títulos. El RPC actual no aporta estudio ni duración. El dueño puede volver a editar.

El usuario aplicó la segunda migración y OpenAPI confirma los RPC. Seguir y dejar de seguir se reflejan en «De amigos», disponible en escritorio y móvil. La copia abre la colección privada en «Mis listas» con un UUID reutilizable en reintentos. El visitante anónimo lee la lista y puede iniciar sesión desde «Guardar lista». El seguimiento se retoma en la misma pestaña si la intención sigue vigente al volver.

Pasaron lint, TypeScript, build con webpack y 23 comprobaciones de permisos y editor. Chrome con datos simulados verificó escritorio oscuro, móvil claro, seguimiento y baja, apertura de la copia, +1, y Escape con retorno de foco en el diálogo de cuenta. La autenticación real y las escrituras con dos cuentas en Supabase quedan por verificar.

### Base de datos para seguir y copiar listas · 7 de noviembre de 2026

OpenAPI confirmó la migración de visibilidad y la ausencia de seguimiento y procedencia de copias. Preparada `202611070002_list_follows_and_copies.sql`. Seguir guarda una referencia por cuenta y lista y permite leer sus datos vigentes para «De amigos». Privatizar oculta los datos del original a quienes lo seguían. Un enlace nuevo requiere seguirlo de nuevo. Copiar crea una colección privada editable con descripción y títulos ordenados, en una transacción y con un UUID por intento para reintentos. La copia permanece si el original se privatiza o elimina.

Se probaron ambas migraciones en PGlite con dos cuentas y acceso anónimo. Pasaron 15 comprobaciones, incluido el contenedor. La migración queda pendiente de aplicar en Supabase y verificar con dos cuentas reales. Los botones y «De amigos» se integrarán después. El contrato está en [listas-compartidas.md](listas-compartidas.md).

### Compartir colecciones y vista previa · 7 de noviembre de 2026

El usuario aplicó la migración de visibilidad en Supabase. Se comprobó el RPC anónimo con token inexistente y la disponibilidad de nombre y usuario en perfiles públicos. En una colección personalizada, Compartir abre un diálogo centrado en escritorio y una hoja inferior en móvil. Guarda la privacidad con sesión y filtro de dueño. El enlace aparece tras la confirmación y admite copia manual si el navegador deniega el portapapeles.

`/l/[shareSlug]` presenta una vista de lectura paginada mediante el RPC anónimo. Open Graph y Twitter Cards usan título, cantidad y nombre público del dueño. El PNG dinámico usa hasta tres portadas y deja de responder al revocar el enlace. La integración con perfil, seguimiento y copias queda para una fase posterior.

Pasaron ESLint enfocado, TypeScript, build con webpack y las pruebas de encabezado y migración. Chrome sobre el build con Supabase simulado verificó escritorio oscuro, móvil claro, Escape y retorno de foco, privacidad, copia y lectura sin sesión. Una solicitud con agente de crawler confirmó los metadatos y el PNG. Al privatizar, la página muestra el estado no disponible sin metadatos de la lista y el PNG responde 404. Pendiente probar una colección compartida real en el dominio publicado.

### Base de datos para listas compartidas · 7 de noviembre de 2026

Preparada, no aplicada, la migración `202611070001_list_visibility.sql`: visibility private/link/public (default privado para filas existentes y futuras), share_slug único generado por la BD, revocación al privatizar y token nuevo al volver a compartir. Consultas públicas solo enumeran public; link requiere get_shared_list con token exacto, paginación y proyección que excluye progreso/notas/etiquetas/enlaces personales. RLS restringe escrituras al dueño, incluidas asociaciones de list_media, y añade guardas restrictivas contra políticas antiguas permisivas. No incluye UI, rutas nuevas, perfil, copias ni seguimiento.

Se inspeccionó el esquema remoto vía OpenAPI, sin leer registros privados: confirmó columnas/tipos y ausencia de los nuevos campos. No hay conexión SQL disponible para aplicar ni auditar políticas y cuerpos de funciones remotos. El preflight de solo lectura y la guía de aplicación están en [listas-compartidas.md](listas-compartidas.md); revisar especialmente get_my_lists_page y vistas/funciones que puedan omitir RLS antes de aplicar.

La migración real pasó nueve casos de comportamiento en PGlite 0.5.15 (diez tests contando el contenedor), con roles anon y authenticated, dos usuarios, políticas antiguas abiertas, aislamiento, revocación y paginación. También se ejecutó el SQL de inspección en la base de prueba y pasó ESLint del test. Sin cambios de dependencias del proyecto. Pendiente auditoría y aplicación remota, comprobación con dos cuentas reales y después implementar controles/vista compartida. No se ejecutó build ni se modificó maquetado.

### Estado de emisión del anime · 7 de noviembre de 2026

Se corrigió la condición que limitaba el estado de la obra a manga. Anime también lo muestra debajo del progreso personal, bajo Emisión, usando getCatalogStatusLabel igual que la ficha: En emisión, Emisión finalizada, Próximamente, En pausa o Cancelado. Manga conserva Publicación. Se reutiliza catalogStatus ya hidratado desde media.status, sin consultas nuevas. ESLint enfocado y TypeScript aprobados; pendiente revisión visual con sesión real.

### Estado de publicación del manga · 7 de noviembre de 2026

Las filas de manga muestran debajo del estado personal una etiqueta Publicación y un punto de color acompañado de texto: En curso, Finalizada, En pausa, Cancelado/Descontinuado o Próximamente. La ausencia de datos indica Sin información. No se añade una columna ni se confunde el progreso personal con el estado de la obra. Se reutilizan las traducciones de catálogo, las equivalencias AniList/MAL y los colores de estado de la tabla.

LibraryRow incorpora catalogStatus separado de status; los adaptadores lo preservan y la hidratación lo lee de media.status dentro de la consulta agrupada existente, sin consultas por fila ni cambios de esquema/proveedores. La vigencia depende del dato ya almacenado en media.

Pasaron ESLint enfocado, TypeScript y las 14 pruebas existentes de editor/acciones. Pendiente inspección visual con sesión real, en móvil/escritorio y temas. No se ejecutó build para este ajuste local.

### Avisos temporales del editor · 7 de noviembre de 2026

Se retiraron las cards persistentes bajo la tabla. El editor cerrado usa el ToastProvider existente para avisar éxito confirmado, error o borrador sin guardar; no repite un mismo resultado al reabrir/cerrar ni anuncia éxito con progreso pendiente. Errores y borradores ofrecen Volver a editar, manteniendo la sesión y el guardado en segundo plano. Los avisos desaparecen a los cinco segundos o con ×; el proveedor compartido limita la pila a tres, incorpora acciones opcionales, roles accesibles y texto con tokens de tema.

Pasaron ESLint enfocado, TypeScript y las 14 pruebas de editor/acciones, ajustadas para comprobar avisos de error y éxito sin duplicados al cerrar de nuevo. Pendiente inspección visual en navegador con sesión real, incluidos temas y móvil. No se cambiaron rutas, límites cliente/servidor, esquema ni sincronización; no se ejecutó build.

### Cierre del editor durante el guardado · 7 de noviembre de 2026

Cerrar con ×, Escape o el fondo ya no espera la solicitud. La tabla mantiene una sesión de edición por título mientras está montada; solo se desmonta el diálogo visual. Esto conserva la escritura en curso, el debounce de 450 ms, el último progreso pendiente y los borradores de metadatos. Reabrir el mismo título reutiliza esa sesión y su revisión, sin crear una escritura paralela. Se puede editar otro título mientras el anterior termina.

Fuera del panel se informa el guardado, éxito o error con el título y un botón para volver a editar. Los errores conservan el borrador y no provocan reintentos automáticos. Los metadatos sin enviar siguen requiriendo Guardar: cerrar no los descarta ni los envía implícitamente. Este comportamiento cubre cerrar el sidebar; no es una cola persistente frente a recargas, navegación que desmonte la tabla o cierre de pestaña.

Verificación: ESLint enfocado, TypeScript y 14 pruebas de acciones/formulario con hooks y red simulados. Se comprobaron cierre antes del debounce, cierre durante una solicitud con otro episodio pendiente, revisión secuencial, errores visibles al cerrar y conservación/guardado explícito de metadatos. Pendiente comprobación de interacción en navegador con sesión real; no se usó una ruta temporal ni se ejecutó build, al mantenerse los límites cliente/servidor y las rutas.

### Contador editable y guardado agrupado · 6 de noviembre de 2026

El panel permite escribir el episodio/capítulo con tipografía de 28 px, borde neutro y hover primario, además de foco visible por teclado. Los botones ± y cerrar son cuadrados de 44 px; ± conserva borde y texto primarios. El cierre del estado de carga usa las mismas dimensiones.

El progreso responde inmediatamente y se guarda tras 450 ms sin cambios. Los clics durante una escritura conservan el último borrador; la siguiente escritura usa la revisión confirmada, sin solicitudes simultáneas ni sobrescribir ediciones nuevas con respuestas anteriores. Los errores retienen el valor y ofrecen reintentar, sin bucles automáticos; el input valida enteros entre cero y el total conocido. Se mantienen autenticación, comparación de revisión y cola de pendientes existentes.

Verificación: ESLint enfocado, TypeScript y diez pruebas (ocho de acciones/datos y dos del formulario con hooks, temporizador y respuestas simuladas). Cubren agrupación, edición durante guardado, revisión de la segunda escritura, límites y errores. Pendiente inspección visual del editor en móvil/escritorio y temas con una sesión real; el navegador disponible no tiene sesión. No se añadió una ruta temporal ni se ejecutó build para este cambio local de componentes.

### Caché de ruta temporal · 6 de noviembre de 2026

La ruta temporal `list-preview`, ya retirada del código, seguía presente en los artefactos de desarrollo y provocaba un error de resolución de `./page.tsx`. Se detuvo el servidor, se trasladó el contenido de `.next/dev` a un respaldo local dentro de `.next` y se reinició con `pnpm dev`. Verificación HTTP sin sesión: `/lists` responde 307 hacia autenticación y `/list-preview` responde 404. No se agregó una ruta de producto ni se modificó la lógica de listas. Las futuras vistas temporales deben verificarse en un servidor aislado para evitar dejar referencias en la sesión de desarrollo habitual.

### Apertura del editor sin consulta extra · 6 de noviembre de 2026

La hidratación de la página visible incorpora updated_at en la misma consulta de progreso que ya hacía. Cada fila conserva existencia/revisión junto a sus datos. El editor usa esa instantánea al abrir y no llama a readLibraryEditor en el flujo normal. Al guardar conserva la validación de sesión y la comparación de revisión en servidor; ante un conflicto pide actualizar la lista antes de reabrir.

Para entradas sin versión precargada se mantiene la lectura de respaldo y se reemplaza el texto de espera por un skeleton con chips, progreso e inputs. No se añade una espera artificial cuando la información ya está disponible ni se crea caché privada global.

Pasaron ESLint enfocado, TypeScript y ocho pruebas de editor, incluida la instantánea precargada y las protecciones existentes de concurrencia. No se midió latencia de una sesión real. La vista temporal de prueba respondió 404 en el servidor disponible y se retiró: queda pendiente comprobar visualmente este skeleton y la ausencia de solicitud al abrir en el navegador real. No se ejecutó build para este ajuste.


### Skeleton al filtrar listas · 6 de noviembre de 2026

El área de resultados compartida admite un fallback propio. Biblioteca y listas pasan un skeleton de tabla que reutiliza las columnas y la adaptación móvil de LibraryTable; el catálogo mantiene la grilla predeterminada y el skeleton general de página no cambia.

Pasaron ESLint enfocado y TypeScript. En una vista temporal retirada se activó la misma señal de carga del área compartida y se verificaron cinco filas, resultados ocultos durante la carga, escritorio oscuro de 1200 px y móvil claro de 390 px sin desborde. La comprobación fue con carga simulada, sin una sesión real. No se ejecutó build: no cambian rutas definitivas, límites cliente/servidor, estilos globales ni configuración.


### Tabla de biblioteca y editor lateral · 6 de noviembre de 2026

Biblioteca completa, estados y colecciones muestran una tabla con portada/título/formato, nota personal, score del catálogo, estado y tres acciones: quitar de favoritos, editar y abrir el enlace personal. El enlace queda deshabilitado si no hay una URL http/https válida. Score usa amarillo desde 8, verde desde 6 hasta menos de 8 y rojo por debajo; los valores ausentes se indican con raya. Viendo/Leyendo muestra episodio o capítulo actual sobre total. En móvil las filas se reorganizan sin scroll horizontal.

Los únicos filtros de títulos son búsqueda por título/nota/etiquetas, tipo y orden, con el Dropdown compartido del catálogo. Búsqueda con debounce, filtros y paginación permanecen en URL. Los enlaces antiguos descartan los filtros retirados y reinician página; un estado único de biblioteca pasa a su pestaña correspondiente. El listado de nombres de colecciones conserva su búsqueda propia. No se modificó el catálogo.

El editor derecho reutiliza el diálogo nativo con foco contenido y Escape. Carga el registro personal al abrir; chips y botones ± guardan estado/progreso al pulsar, sin anunciar éxito hasta la respuesta. Nota, enlace y etiquetas se guardan juntos con botón explícito. Se conservan borradores ante fallos y se consulta antes de descartarlos al cerrar. La acción devuelve el registro de la propia escritura y compara updated_at para rechazar ediciones antiguas; la creación concurrente no sobrescribe registros. Al completar se usa el total conocido y llegar a ese total desde Viendo completa el título; no se permite superar el total.

Las nuevas acciones validan sesión, identificador, entradas y la cola de pendientes. Escriben solo registros del usuario autenticado y conservan los triggers de sincronización existentes. Quitar de favoritos es idempotente: elimina solo favorites, preservando progreso, notas y colecciones, como el comportamiento anterior. Se informa esa distinción antes y después de quitar. No se implementó una eliminación general de biblioteca ni se modificaron tablas/RLS.

La tabla completa datos personales y totales únicamente para los IDs de la página visible, mediante consultas agrupadas, para compatibilidad con respuestas RPC antiguas. No se hacen consultas por fila ni escrituras a proveedores. El skeleton acompaña la tabla.

Verificación: ESLint enfocado, TypeScript y 17 pruebas (7 nuevas de editor/filtros, 3 de encabezado y 7 de pendientes). Las pruebas de acciones usan un cliente Supabase simulado: cubren límites, URLs, sesión, ausencia de cola, edición obsoleta, inserción concurrente, preservación de progreso al guardar nota y filtrado por usuario; no prueban RLS remoto. Vista temporal retirada: tabla a 1440/1200 px y móvil emulado de 390 px, ambos temas, Dropdown y URL de película, estado activo con borde primario, editor, Escape y retorno del foco, error sin sesión que conserva borrador y estado. No se guardó en cuentas reales. Build con webpack aprobado; no se cambió la configuración por defecto.

Pendiente: comprobar escritura y eliminación con cuenta real y migración de pendientes aplicada, filtros sobre datos reales y aislamiento RLS entre dos cuentas. Próximo paso: revisar la densidad de la tabla y el editor con la biblioteca real.


### Encabezado de listas y ruleta · 5 de noviembre de 2026

Biblioteca completa, vistas por estado y colecciones seleccionadas usan un encabezado con hasta tres portadas aleatorias sin repetir, nombre en Unbounded y estadísticas en JetBrains Mono. En colecciones de menos de tres portadas se muestran las disponibles; si no hay ninguna se conserva un espacio neutro. Las estadísticas corresponden a toda la selección, independientes de filtros y paginación: títulos, completados, por completar y episodios de anime restantes cuando existe total. Se aclaran los totales desconocidos; no se inventan duraciones ni horas.

«¿Qué veo hoy?» consulta de nuevo los datos al pulsar y sortea anime pendientes o sin estado; excluye manga, completados, viendo, en pausa y abandonados. Evita repetir el resultado inmediato si hay alternativas. La tarjeta aparece solo tras un resultado exitoso y ofrece Ver anime y Tirar de nuevo. No cambia progreso; Empezar EP 1 queda para un flujo de escritura posterior. Compartir aparece deshabilitado en colecciones propias, con indicación de próximamente.

El servicio reutiliza lecturas locales paginadas y comprueba sesión y propiedad de la colección; la acción de sorteo vuelve a aplicar esas comprobaciones. Solo se envían al cliente las portadas, el resumen y el resultado, no toda la lista. Esta primera integración realiza una lectura adicional de la colección para el encabezado; no consulta proveedores ni cambia RLS o sincronización.

Verificación: lint enfocado, TypeScript y tres pruebas de resumen/candidatos/muestreo aprobados. Vista temporal retirada: escritorio oscuro y móvil claro, sin desborde, tarjeta inicialmente oculta y aviso al intentar sortear sin sesión. Se usaron datos ficticios y portadas neutras; quedan pendientes portadas reales, sorteo exitoso y tarjeta resultante con cuenta real, listas privadas ajenas, vacíos y revisión completa de teclado. El build se interrumpió después de permanecer en compilación sin resultado; no se considera aprobado.


### Columna de Biblioteca y Mis listas · 5 de noviembre de 2026

Se reemplazaron los iconos de Biblioteca por puntos de color (menta, azul, violeta, ámbar y coral) y cantidades alineadas a la derecha. Pendientes precede a Completados, como en la referencia. Nueva lista incorpora + y peso normal. Se conserva Toda la biblioteca para acceder a entradas sin progreso.

Mis listas muestra las colecciones propias por nombre, con un punto multicolor y cantidad de elementos, o un mensaje vacío. El encabezado permite abrir el listado completo. El selector móvil incluye estados y colecciones. De amigos conserva su aviso anterior.

El servicio nuevo consulta la sesión en servidor, filtra por el usuario autenticado y usa el cliente con RLS. Lee estados por páginas y cantidades agregadas de elementos por colección, sin consultas por cada lista ni llamadas a proveedores. Los contadores representan todos los títulos (anime y manga), sin filtros de la vista. Un fallo muestra un aviso y cantidades desconocidas, no ceros falsos. No se modifican permisos ni escrituras.

Verificación: ESLint enfocado, TypeScript y revisión de diff. Vista temporal con datos ficticios, retirada al terminar: escritorio de 1440 px en ambos temas, selector móvil y foco visible, nombres largos y ausencia de desborde. La inspección no verifica contadores con una cuenta real; quedan pendientes la consulta real, estados de fallo/vacío y navegación completa por teclado. Build interrumpido al permanecer en compilación sin resultado. Próximo paso: revisar la columna con la biblioteca real y continuar con el contenido principal.


### Mis Listas: primera unificación · 5 de noviembre de 2026

El navbar conserva un único acceso «Mis listas». La entrada de `/lists` muestra la biblioteca completa mediante el servicio y la grilla que usaba Favoritos, incluidas las entradas sin progreso. `/favorites` redirige a `/lists?tab=library` conservando búsqueda, filtros, paginación y avisos OAuth. Los enlaces existentes por estado y colección mantienen sus parámetros. No se convierte ningún registro en «Me encanta».

La primera adaptación de 07-listas usa navegación lateral en escritorio y selector nativo en móvil, Nueva lista, encabezados de biblioteca/colecciones y filtros desplegables con aviso cuando hay filtros activos. Se conservan creación, exportación, sincronización, edición y paginación existentes. El panel de filtros incorpora un modo integrado opcional; otros usos conservan su comportamiento anterior. No cambian servicios, permisos, tablas ni cola de pendientes.

Esta entrega es una base parcial: todavía conserva las grillas actuales y el listado de colecciones, sin portada compuesta, filas con duración, orden manual ni ruleta. «De amigos» se anuncia como próximo paso, sin acciones simuladas. La prioridad acordada para la fase de datos es compartir por link en modo lectura y permitir seguir o copiar una lista, con permisos/RLS y aislamiento verificados. La coedición y «Me encanta» son funcionalidades separadas.

Validación: TypeScript y git diff --check aprobados. Lint enfocado y build se interrumpieron tras permanecer sin resultado; no se consideran aprobados. El navegador confirmó que /lists redirige al login sin sesión, pero las demás navegaciones agotaron el tiempo; no se verificaron móvil/escritorio, temas, teclado ni una sesión real. Se revisaron los cambios y la preservación de parámetros por lectura de código. Completar estas comprobaciones antes de dar por cerrada la fase visual.


### Nombres de los días · 5 de noviembre de 2026

La franja de selección muestra los días completos desde 1024 px y abreviados en anchos menores. Los encabezados de la vista semanal de escritorio también usan nombres completos. Verificado en navegador a 1440 px (Día y Semana) y 390 px, sin desborde. Pasaron lint enfocado y TypeScript. No cambia la navegación ni los datos.

### Franjas de estado del calendario · 5 de noviembre de 2026

Las tarjetas diarias y semanales tienen una franja izquierda de 5 px. Viendo usa menta, Pendiente azul, En pausa ámbar y Abandonado rojo coral, con los colores de la referencia adaptados a ambos temas mediante variables locales al calendario. La leyenda al pie identifica los cuatro colores y las tarjetas conservan la etiqueta textual del estado. Completado y títulos sin seguimiento usan borde neutro.

El componente recibe la biblioteca completa que ya se consultaba para reconocer Abandonado en «Todas las emisiones». El filtro «Lo que sigo», el próximo episodio personal y las acciones de progreso conservan Viendo/Pendiente/En pausa; no se ofrecen acciones de progreso para Abandonado o Completado. No cambian consultas, escrituras ni permisos.

Verificación visual con una ruta temporal de datos de prueba, retirada al terminar: franjas de 5 px y leyenda en Día/Semana, escritorio oscuro de 1440 px y móvil claro de 390 px sin desborde; «Lo que sigo» muestra únicamente los tres estados previstos. La leyenda también se comprobó en la ruta real sin sesión. No se modificaron datos de cuentas reales. Pasaron lint enfocado, TypeScript y las 12 pruebas existentes de calendario/progreso/próximas emisiones. El build se interrumpió tras permanecer varios minutos en compilación sin resultado; no se considera aprobado. Pendiente comprobar la presentación con la biblioteca real del usuario y completar el build.

### Corrección de consulta personal de próximos episodios · 4 de noviembre de 2026

Se reprodujo un HTTP 400 de AniList con la selección real de campos y 40 alias: «Max query complexity should be 500 but got 520». Las tandas personales se redujeron a 25 títulos, manteniendo la lectura secuencial, `no-store`, la deduplicación de IDs y el aviso de consulta incompleta si alguna tanda falla. El helper compartido corrige tanto el calendario como la consulta personal de Inicio. No cambia la biblioteca ni el progreso.

La consulta pública de prueba con 25 alias respondió HTTP 200 y devolvió los 25 resultados. Pasaron lint, tipos y 17 pruebas de próximas emisiones y horarios, incluidas tres nuevas de bibliotecas grandes (61 títulos), fallo intermedio y biblioteca vacía. La reproducción usa un ID público; queda pendiente confirmar el resultado con la sesión real del usuario. No se ejecutó otro build: solo cambian el tamaño de tanda del servicio y las pruebas/documentación.

### Próximo episodio independiente del período explorado · 4 de noviembre de 2026

El panel consulta próximas emisiones desde el instante actual y permanece visible incluso en el catálogo estacional. Cambiar semana, año o temporada solo cambia la programación explorada. «Lo que sigo» usa los ID MAL de la biblioteca autenticada en estados Viendo/Pendiente/En pausa; «Todas las emisiones» consulta la programación pública, también con sesión. Biblioteca vacía no se reemplaza por emisiones generales. Hoy/Mañana son relativos al presente; otras fechas incluyen año para evitar confusión con el período explorado.

Se reutilizan la consulta por tandas y los validadores de Inicio: la consulta personal no tiene caché compartida; la pública ordena los primeros 200 horarios futuros de AniList por fecha y usa caché de 60 segundos. No se restringe por temporada ni se usan horarios habituales estimados de MAL. Son horarios anunciados por AniList, no garantía de disponibilidad en una plataforma. Si la consulta personal es parcial o falla, no se presenta un candidato como definitivo. Sin horarios o con datos agotados se ofrece actualizar. El reloj descarta emisiones vencidas y avanza entre los candidatos cargados; al agotarlos requiere actualizar. No cambiaron escrituras, RLS ni sincronización.

Verificación: lint enfocado, tipos, 22 pruebas de próxima emisión/calendario/progreso/Inicio y build aprobados. En navegador sin sesión se verificó que la misma próxima emisión se conserva al pasar de la semana actual a la siguiente y al catálogo de otoño de 2025; panel visible en móvil de 390 px y escritorio. Las pruebas cubren biblioteca vacía, ID propios, futuro fuera de temporada, vencimiento, exclusión de estimaciones y fallos. Pendiente verificar Lo que sigo con una cuenta real y casos de error visuales. La cobertura del proveedor y la falta de equivalencia MAL pueden dejar títulos personales sin horario.

### Cabecera del calendario y tipografías · 4 de noviembre de 2026

Se retiró la clave de Suspense basada en todos los parámetros: al navegar desde los controles a otra semana, año, temporada o modo, React conserva la interfaz revelada mientras llegan los resultados. La transición muestra «Actualizando calendario…» debajo de los controles y atenúa e inhabilita los resultados anteriores. La carga inicial conserva su skeleton. No fue necesario agregar un layout ni cambiar consultas, permisos o contratos. La navegación de datos ahora usa push para permitir volver a la selección anterior.

El encabezado del calendario incorpora con `next/font` JetBrains Mono (etiquetas de 11 px, mayúsculas y separación de 0.14em) y Unbounded (título), limitadas a esta pantalla; Manrope sigue en el resto de la interfaz. El panel de próximo episodio amplía su ancho hasta 460 px y muestra portada, título/episodio, fecha y hora local, con la cuenta regresiva a la derecha en formato horas:minutos y su leyenda. El valor es tiempo restante, no la hora de emisión. La incorporación global de las fuentes sigue pendiente.

Pasaron lint enfocado, TypeScript, ocho pruebas de calendario/progreso y build de producción. En navegador sin sesión se verificó que el documento y el mismo nodo del título permanecen durante los cambios desde los controles de semana, año y Todas las emisiones; se observó la carga inferior y el catálogo de 2025. Se revisaron las fuentes efectivamente cargadas, escritorio oscuro de 1440 px y móvil claro de 390 px sin desborde. Atrás recupera los parámetros anteriores; no se afirma persistencia del nodo durante esa navegación. Pendiente comprobar Lo que sigo con una sesión real y sus datos privados.

### Maquetado de agenda diaria · 4 de noviembre de 2026

En la rama `calendar-design`, el calendario abre en una agenda diaria con portadas de 56 × 80 px, títulos completos, hora, episodio y estado de emisión. Una franja muestra los siete días, sus fechas y cantidades; hoy y el día seleccionado tienen indicadores distintos. En escritorio se puede alternar Día / Semana; en móvil se presenta un día por vez. Esta entrega ajusta deliberadamente la propuesta original de siete columnas como vista inicial, según la revisión de UX con el usuario.

Los parámetros `day` y `layout` conservan la presentación al recargar y permiten volver con Atrás. Los cambios de presentación usan History API integrada con Next.js y reutilizan la semana cargada. La preferencia no se guarda en perfil ni entre visitas sin esos parámetros. Año y temporada se agrupan en «Explorar temporada». «Todas las emisiones» reemplaza la etiqueta ambigua «Toda la temporada», manteniendo el catálogo estacional separado. El skeleton acompaña la agenda. No se modificaron proveedores, permisos, sincronización ni la acción de progreso.

Verificación: ESLint de los tres componentes afectados, TypeScript y ocho pruebas existentes de calendario/progreso aprobados. Inspección sin sesión en escritorio de 1440 px y móvil emulado de 390 px, temas claro y oscuro, imágenes reales, títulos largos, selección mediante teclado, foco, Atrás y recarga con día seleccionado. Sin desborde horizontal en móvil ni errores de consola tras recargar. Pendientes: inspección con sesión real, guardado y estados de fallo/vacío con datos reales. No se ejecutó build porque no cambiaron rutas, límites cliente/servidor, dependencias, estilos globales ni configuración. Próximo paso: evaluar este primer maquetado con el usuario antes de ajustar densidad y jerarquía.

Última revisión: 2026-11-01. Al retomar, contrastar este documento con el código y `git status`.

## Objetivo actual

Avanzar gradualmente con el rediseño visual, conservando la funcionalidad actual. La marca, las superficies Aurora clara y nocturna y Manrope para la interfaz están incorporadas. La menta de acción reemplaza el primario violeta global en ambos temas; la base visual todavía está incompleta.

## Base observada

- Next.js 16.4.3, React 19.2.3, Tailwind v4, TypeScript estricto, Supabase, AniList y MyAnimeList.
- Catálogos de anime/manga, fichas, personajes, calendario, favoritos/biblioteca, listas, perfil, amigos y conexiones con proveedores presentes en el código.
- Calendario actual en `/anime/schedule`; configuración de perfil en `/profile`; temas actuales `dark`/`light` mediante `anitrack-theme`. `/calendar` y `/settings/[section]` pertenecen a la propuesta.
- Hay cambios locales previos de sincronización y una migración de pendientes; no se modifican en esta tarea. Ver [documentación de sincronización](guardado-local-y-sincronizacion.md).
- Esa documentación informa que `202610280001_library_sync_pending.sql` no fue aplicada al proyecto remoto. Esta sesión no verificó ni cambió el entorno remoto.

## Acuerdos de trabajo

| Acuerdo | Motivo |
| --- | --- |
| `AGENTS.md` es la guía común; `CLAUDE.md` remite a ella | Evitar reglas y arquitectura divergentes entre herramientas |
| `README.md` describe la app; este archivo registra continuidad | Separar documentación estable del avance |
| Prompts en `docs/PROMPTS.md` | Dar alcance concreto a cada chat |
| Implementación gradual según los requisitos | Mantener la app utilizable en cada fase |
| Preservar guardado local y sincronización por pendientes | Evitar reintroducir llamadas remotas por cada clic |

## Entregas del rediseño

1. **Identidad (parcial):** anillo de progreso, play y chispa en la barra superior, con colores adaptados a los temas claro y oscuro existentes. Se mantienen navegación, selector de tema y rutas actuales.
2. **Base visual (parcial):** fondos, texto y superficies de Aurora clara y nocturna adaptados al selector actual. Manrope está configurada para la interfaz. El primario y el foco usan la menta de Aurora en toda la app; se adaptaron controles con texto blanco sobre el primario. Manrope se verificó cargada y aplicada en Inicio; la familia de títulos y la monoespaciada de la propuesta aún no están implementadas. Unbounded y JetBrains Mono quedan pendientes. La barra superior conserva sus controles. Estreno y la persistencia en perfil requieren una fase de datos independiente.
3. **Catálogo y fichas:** renovar presentación y filtros de forma gradual, conservando acciones y parámetros actuales.
4. **Biblioteca y listas:** revisar primero la separación de conceptos y la compatibilidad de datos; luego adaptar las pantallas por partes.
5. **Inicio, calendario, perfil y social (parcial):** Inicio muestra un saludo con fecha local y hasta tres series aleatorias de «Viendo» con su próximo horario o episodios restantes para usuarios con sesión; sin sesión, el panel «Hoy» muestra emisiones públicas cercanas a la hora local. «Lo que viene» ocupa el ancho disponible. El ranking conserva los diez títulos y enlaces actuales. La sinopsis de «Lo que viene» se consulta en la ficha. Continuar actualizando cada pantalla visualmente. Horarios nuevos, compartir, recomendaciones y ajustes son funcionalidades posteriores, no implícitas en el rediseño visual.

La propuesta funcional de siete fases sigue en los requisitos; cambios de esquema, permisos y sincronización requieren alcance y verificación propios.

## Rediseño pendiente

Referencias: [guía visual](../Requerimientos/AniTrack-rediseno/LEEME.md) y [requisitos de flujos](../Requerimientos/AniTrack%20%C2%B7%20Requerimientos%20del%20redise%C3%B1o.md). Las maquetas no implican implementación.

Orden de los requisitos: base visual → conceptos y card → filtros → listas → compartir → calendario → social y ajustes.

Puntos a resolver al planificar la fase correspondiente:

- Compatibilidad entre `favorites` como biblioteca actual y la separación futura de Biblioteca, Me encanta y listas; no migrar automáticamente a “Me encanta”.
- Los tres temas y automático ya están en Ajustes → Apariencia con persistencia de navegador; persistir en `profiles.theme` requiere la fase de datos.
- Transición de rutas y enlaces de calendario, favoritos y ajustes.
- Coedición de listas: los requisitos dejan abierta su inclusión en fase 4 o su postergación.
- Esquema real y migraciones aplicadas: el repositorio no documenta un bootstrap completo de Supabase.

## Horarios de emisión: investigación

- [AniList](https://docs.anilist.co/reference/object/media) ofrece `nextAiringEpisode` y `airingSchedule`; sus registros incluyen hora y número de episodio. [AniList advierte](https://docs.anilist.co/reference/object/airingschedule) que solo procura garantizar exactitud en emisiones futuras. Por sí solos, los horarios no prueban qué episodios anteriores están disponibles ni cuándo los vio una persona.
- El adaptador de MAL ya solicita `broadcast` y expone día y hora opcionales. `getMalScheduleToday` agrupa por el día del servidor; todavía no convierte horarios al huso del usuario. La zona de origen y cobertura de MAL necesitan confirmación antes de usarla como alternativa.
- Con sesión, Inicio lee mediante RLS y paginación los animes del usuario con estado `watching` y selecciona hasta tres al azar sin repetir. Una consulta sin caché a AniList por `idMal` alimenta el horario de esas tarjetas; si no hay próxima emisión, las tarjetas muestran episodios restantes cuando se conoce el total. La selección y la consulta de esas tarjetas se reutilizan por solicitud, sin caché compartida entre usuarios. El panel lateral usa la biblioteca completa como se detalla más abajo. Sin sesión, el panel público consulta hasta cuatro páginas de emisiones en una ventana de 54 horas y selecciona hasta dos anteriores y dos posteriores de hoy en la zona del navegador; informa si el resultado es parcial o si la ventana quedó vencida. La línea de hora se actualiza cada minuto. El panel no nombra al proveedor y aclara que las emisiones anteriores pueden estar incompletas. La grilla izquierda sin sesión todavía usa el día del servidor de MAL. El guardado y la sincronización no cambiaron.

## Validación de esta entrega

Pasaron lint enfocado, `pnpm exec tsc --noEmit` y 11 pruebas de `home-watching`, `home-greeting` y `home-airing` con Node.js 24, que incluyen selección sin repetición, progreso, zonas horarias y respuestas externas. En navegador sin sesión se comprobó el enlace para ingresar y la vista pública. `pnpm build` también pasó. En móvil se verificó el ancho sin desborde; la captura no se completó. La captura del usuario mostró la vista sin sesión; no se pudo inspeccionar con una sesión real la selección, los horarios ni el aislamiento entre usuarios. No se agregaron botones de incremento ni se cambiaron las escrituras de progreso o la cola de sincronización. No se aplicaron migraciones ni se publicó la app.

El lint de una entrega anterior reportó un error preexistente en `AnimeCard.tsx` por `setState` en un efecto. Los scripts `test:*` de `package.json` apuntan a archivos ausentes en este checkout; los tests disponibles y sus condiciones están documentados en `README.md`.

## Próximo paso

Verificar la selección aleatoria, tarjetas, horarios y aislamiento con sesión real y dos usuarios; definir una operación de progreso segura ante ediciones concurrentes antes de ofrecer «Vi el EP» o contar episodios nuevos. Revisar también el día de la grilla de MAL según la zona del usuario. Quedan pendientes las tipografías restantes y el error previo de lint en AnimeCard. Contrastar los cambios con ambos temas y las pantallas reales. Antes de editar, revisar el estado del checkout y preservar los cambios existentes.

## Mantenimiento

Al cerrar una entrega, actualizar fecha, estado real y próximo paso. Registrar decisiones que afecten trabajo futuro y resultados de validación. Git conserva el historial: no acumular una lista interminable de acciones. No marcar como implementado, probado o desplegado algo que solo fue planificado.

### Panel personal de emisiones

Con sesión, el panel consulta todos los anime guardados en `favorites` (la biblioteca actual), no solo las tres tarjetas aleatorias de Viendo. Cruza sus ID MAL con los horarios públicos de la ventana y muestra «Hoy» si encuentra emisiones en el día local. Si no encuentra ninguna, muestra la próxima emisión futura cuya temporada y año de estreno en AniList coinciden con la temporada local actual. No presupone que una serie de una temporada anterior pertenece a la actual aunque continúe en emisión. Los títulos sin correspondencia MAL o sin temporada/horario informado por el proveedor pueden quedar fuera. La ventana pública se limita a 200 registros y AniList no garantiza emisiones pasadas: se indica si está incompleta y no se presenta la alternativa como definitiva si la consulta resulta parcial. Una falla de proveedor muestra un mensaje recuperable. La consulta privada de episodios se agrupa en tandas de hasta 25 y no utiliza caché compartida; no se alteraron guardado ni sincronización.

Pruebas de selección y validación: `node --test tests/home-airing.test.mjs`. La verificación visual con una cuenta y datos reales queda pendiente.

La consulta GraphQL de datos de temporada y próxima emisión se comprobó contra AniList. ESLint y TypeScript pasaron para el cambio. La compilación de producción quedó sin verificar: se interrumpió al permanecer en compilación sin terminar. No se pudo inspeccionar el panel con sesión en el navegador durante esta tarea.

### Barra superior: actualización visual

Los enlaces usan superficie redondeada, hover menta y una línea inferior menta para la ruta activa, también en el menú móvil. El buscador adopta la superficie de la referencia y Ctrl+K/Cmd+K enfoca el campo; en móvil abre el menú. Se conserva el selector de tipo de búsqueda, el cambio de tema, las rutas y los accesos existentes. El avatar conserva la imagen de perfil y agrega un borde con el degradado de la marca; Escape cierra el menú de cuenta y devuelve el foco. El fallback tiene la misma altura que la barra.

Se verificaron ESLint enfocado y TypeScript; en el navegador sin sesión se inspeccionaron escritorio y móvil en temas claro y oscuro, el atajo de búsqueda, la ausencia de desborde y la ruta activa de Calendario. Queda pendiente inspeccionar el avatar y el menú con una sesión real. No se ejecutó build: no se cambiaron rutas, límites cliente/servidor, dependencias, estilos globales ni configuración.

El foco del buscador ya no dibuja un rectángulo dentro del campo: se indica en el contorno de toda la búsqueda, tanto en escritorio como en móvil. Se comprobó con Ctrl+K en navegador, en temas oscuro y claro, además de ESLint y TypeScript.

### Portadas en los horarios de Inicio

El panel de emisiones muestra portadas pequeñas junto a los títulos en la vista pública y en la personalizada, incluida la próxima emisión. Se solicitan en las consultas de horarios existentes, sin llamadas por tarjeta; una imagen ausente, inválida o que falla conserva un espacio neutro y no oculta el horario. Las URL se restringen al dominio de imágenes permitido de AniList. Pasaron ESLint enfocado, TypeScript y las pruebas de horarios, incluidos portadas ausentes e inválidas. Se comprobó la carga real y el diseño público en móvil y escritorio, en temas claro y oscuro; queda pendiente la inspección con una sesión real.

### Catálogo: navegación y próxima fase de filtros

El navbar agrupa anime y manga en «Catálogo», que abre `/anime`; ambas rutas conservan sus enlaces existentes y comparten una cabecera con selector Anime / Manga. Al cambiar de tipo se conservan los parámetros comunes, se descartan temporada y formato específicos y se reinicia la paginación. El calendario sigue teniendo su estado activo independiente.

Acuerdo para la próxima fase: adaptar los filtros con panel lateral en pantallas suficientemente amplias, barra superior en anchos intermedios y panel móvil; evaluar el punto de cambio con la grilla real (alrededor de 1400 px como referencia, no como límite definitivo). El usuario prefiere quitar el control de géneros excluidos del catálogo. La fase de filtros debe definir una transición clara para URL antiguas con `excludeGenre`, sin que quede activo un filtro invisible, y conservar la multiselección de géneros incluidos. La biblioteca usa el mismo componente de filtros y debe tratarse sin cambios involuntarios. Esta entrega aún no rediseña los filtros.

Validación de navegación: ESLint enfocado, TypeScript y `pnpm build` pasaron. En navegador sin sesión se comprobó el selector en escritorio y a 390 px, temas claro y oscuro, navegación por teclado, conservación de búsqueda y género al cambiar de tipo, descarte de filtros específicos y activación independiente de Calendario. Pendiente verificar con sesión real y completar el rediseño de filtros acordado.

### Catálogo: encabezado persistente

Las páginas de `/anime` y `/manga` ahora comparten el layout de `src/app/(catalogo)`; los paréntesis organizan los archivos y no cambian las URL. El encabezado consulta la ruta y los parámetros actuales en el cliente, mientras los resultados siguen renderizándose en el servidor con estados de carga. El calendario y las fichas permanecen fuera de este layout. No se modificaron los filtros ni la selección de proveedor.

Pasaron ESLint, `pnpm build` y `pnpm exec tsc --noEmit` tras regenerar tipos de rutas: antes de la compilación, TypeScript encontró referencias obsoletas en `.next/types` a las ubicaciones anteriores. En navegador sin sesión se comprobó en ambas direcciones que el documento y el mismo nodo del encabezado permanecen al cambiar, con búsqueda y género conservados, filtros específicos descartados, teclado y botón Atrás; se verificaron 390 px y escritorio sin desborde, además del calendario y respuestas HTTP 200 de fichas de anime y manga. El rediseño adaptable de filtros acordado sigue pendiente.

### Filtros del catálogo

El catálogo de AniList tiene un panel lateral desde 1400 px, barra superior en anchos intermedios y panel desplegable en móvil. Permite seleccionar varios géneros, estados, formatos y rangos de puntuación antes de aplicar una sola navegación; mantiene búsqueda, año, temporada para anime y orden. Los filtros aplicados se muestran como chips removibles y se conservan en la URL; al cambiarlos se reinicia la paginación. Los enlaces antiguos con `excludeGenre` siguen aplicando ese filtro, pero lo muestran como «Excluido» para quitarlo; ya no se ofrece un control para agregar exclusiones en catálogo. La biblioteca conserva su panel y sus capacidades existentes. El catálogo de MyAnimeList mantiene sus controles y restricciones propias, con estilo actualizado; sus cambios siguen aplicándose según su flujo anterior.

Validación: pruebas de parámetros y exclusiones antiguas, ESLint, TypeScript y compilación. En navegador sin sesión se verificaron panel lateral ancho, barra a 1200 px, móvil a 390 px, ambos temas, selección múltiple antes de aplicar, quitar una exclusión antigua, navegación de anime y manga, cierre con Escape y retorno de foco; también se comprobó la carga de MyAnimeList para manga. Queda pendiente verificar con sesión real y ajustar la presentación de filtros de MyAnimeList si se busca un diseño completamente uniforme.

### Ajustes de filtros y orden del catálogo

Se corrigió la superposición de la barra intermedia con el panel lateral en el punto de corte. En pantallas amplias y en el panel móvil, géneros, estado, formato y puntuación se muestran como chips multiselección, con indicador y estado accesible; año y temporada también están visibles sin acordeones. Solo queda una pareja de botones para aplicar y limpiar al final del panel. En ancho intermedio se conservan los desplegables y se muestran las selecciones pendientes por separado de los filtros ya aplicados. El orden pasó a la parte superior derecha de los resultados y se aplica de forma independiente, sin descartar un borrador de filtros; para MyAnimeList conserva las restricciones existentes entre búsqueda, estado y ranking.

Verificación sin sesión: un único formulario visible en 767, 768, 1399, 1400 y 1720 px; chips y panel móvil, selección pendiente y aplicación tras cambiar el orden, URL antiguas con exclusiones y orden de MyAnimeList. Queda pendiente probar el flujo visual con una sesión real. No se alteró el panel compartido de la biblioteca.

### Superficie de los filtros

El buscador y los chips del catálogo usan el fondo del panel. Los chips seleccionados conservan marca, borde y texto del color primario; los demás resaltan al pasar el cursor. En escritorio amplio el contenedor desplazable tiene las dos esquinas izquierdas redondeadas y una barra fina; el fondo y el borde pertenecen al contenedor que hace scroll. No se cambiaron consultas ni parámetros.

Se comprobó la apariencia en escritorio y móvil, temas claro y oscuro, scroll hasta el final, selección y aplicación, y foco y selección con teclado. Los colores de texto de chips sobre la tarjeta superan 4,5:1 en ambos temas. Pasaron ESLint enfocado, TypeScript y las pruebas de parámetros del catálogo. La comprobación se realizó sin sesión iniciada.

### Detalles de los filtros del catálogo

Los chips y etiquetas removibles usan cursor de interacción. El selector de temporada y los campos numéricos del rango de año usan el fondo de su contenedor en el catálogo; el componente de año conserva su apariencia anterior en la biblioteca. En la barra intermedia solo puede permanecer abierto un desplegable, y se conservan las selecciones pendientes al cambiar de uno a otro. Escape cierra el desplegable y devuelve el foco; un clic afuera lo cierra.

Según [la referencia de consultas de AniList](https://docs.anilist.co/reference/query), `season` recibe un único `MediaSeason`; una consulta de introspección a `Page.media` confirmó que no existe un argumento de lista para temporadas. Por pedido del usuario, se mantuvo el selector de temporada única y no se alteraron las consultas.

Pasaron ESLint enfocado, TypeScript y las pruebas de parámetros del catálogo. En navegador sin sesión se verificaron fondos en móvil y escritorio, temas claro y oscuro, cursor, ausencia de desborde, apertura exclusiva, conservación de género y temporada pendientes, cierre exterior y Escape con retorno de foco.

### Selector de temporada

El catálogo de AniList reutiliza el `Dropdown` de la barra superior para temporada, con menú integrado al espacio desplazable del panel y colores de ambos temas. Se mantiene la selección única y el estado en la URL. En los filtros intermedios, los desplegables desmontan su contenido al cerrarse para que una lista interna no reaparezca abierta; el primer Escape cierra la lista y el siguiente cierra el filtro. La fecha y demás selecciones pendientes se conservan al pasar entre filtros.

Verificado sin sesión en escritorio, ancho intermedio y móvil, temas claro y oscuro: opciones visibles, selección y aplicación, cambio entre filtros, año pendiente, cierre con Escape y foco. Pasaron ESLint enfocado, TypeScript y pruebas de parámetros del catálogo. No se modificó el componente `Dropdown` compartido ni las consultas.

### Orden y proveedor del catálogo

El orden de anime y manga reutiliza el `Dropdown` compartido, con el menú alineado al borde derecho y las mismas opciones y reglas de cada proveedor. La selección de proveedor se presenta como «Datos de … · cambiar a …», sin el bloque grande anterior. Se conserva la preferencia en la cookie existente y el cambio de proveedor sigue recargando la página y conservando solo la búsqueda por texto cuando corresponde; la elección definitiva en Ajustes queda pendiente para una fase posterior. El aviso de error, reintento y cambio de proveedor conserva su presentación y comportamiento existentes. Personajes mantiene su selector anterior.

En navegador sin sesión se verificaron los menús en móvil y escritorio, temas claro y oscuro, Escape y foco, orden con filtros pendientes, cambio en ambos sentidos entre AniList y MyAnimeList y las reglas de orden de MyAnimeList. Pasaron ESLint enfocado, TypeScript y las pruebas de parámetros del catálogo. No se comprobó visualmente el estado de fallo de proveedor ni una sesión real.
La compilación de producción también pasó después de estos cambios.

### Superficies de filtros por proveedor

Los botones de filtros intermedios de AniList y los selectores de estado, año y temporada de MyAnimeList usan la misma superficie que el orden. El buscador y la agrupación de año y temporada de MyAnimeList se integran al panel; se conserva el aviso visual cuando falta completar la selección. No cambiaron las consultas ni los parámetros.

Pasaron ESLint enfocado, TypeScript y las dos pruebas de navegación de filtros del catálogo. En navegador sin sesión se comprobaron ambos proveedores, los temas claro y oscuro, el ancho móvil sin desborde, la selección pendiente de AniList y la apertura y cierre con Escape del menú de MyAnimeList.

### Búsqueda de anime clasificado para adultos

Las búsquedas explícitas de anime incluyen títulos marcados para adultos: AniList deja de forzar `isAdult: false` al buscar y MyAnimeList recibe `nsfw=true` en ese caso. Esto también puede incluir hentai; la clasificación de adulto no equivale a ese género. El catálogo sin búsqueda, manga y horarios conservan sus filtros anteriores. La app no lee las preferencias de contenido de las cuentas vinculadas; queda pendiente una preferencia propia en Ajustes y definir su alcance.

Se comprobó sin sesión que las sugerencias y el catálogo encuentran «Android wa Keiken Ninzuu ni Hairimasu ka??» con ambos proveedores y que la ficha responde con ambos. AniList lo identifica como adulto sin asignarle el género hentai. Pasaron ESLint enfocado, TypeScript y las pruebas existentes de navegación del catálogo. No se verificaron las preferencias ni el guardado con una cuenta real.

### Calendario semanal · 4 de noviembre de 2026

Se rediseñó `/anime/schedule` a partir de `11-calendario.html`. La semana va de lunes a domingo, con miniportadas, línea de hora actual y selección de un día en móvil. Se conservaron la consulta por año/temporada y las acciones de las cards en el catálogo de temporada. La URL conserva el modo, período, semana y vista.

Las emisiones fechadas de AniList incluyen títulos que empezaron en temporadas anteriores. En la temporada actual se agregan las emisiones japonesas y de streaming de TVmaze, con caché por fecha y atribución. En la semana actual se usan además horarios habituales de MAL, indicados como estimaciones. Para períodos anteriores se consultan las emisiones fechadas de AniList y el catálogo estacional con respaldo de MAL. Un fallo parcial se anuncia en la pantalla. La unión compara ID MAL o títulos y alias, episodio y cercanía horaria. Las equivalencias ambiguas se mantienen separadas.

Los enlaces a IMDb provienen de identificadores de serie publicados por TVmaze. Los [archivos públicos de IMDb](https://developer.imdb.com/non-commercial-datasets/) incluyen notas y votos pero no un calendario semanal con horarios. Queda para una fase posterior verificar la identidad de cada obra y traer su puntuación a la ficha.

La hora automática se detecta en el navegador. En Ajustes → Preferencias → Hora del calendario se puede elegir una zona IANA o volver al modo automático. La preferencia explícita se guarda en los metadatos del usuario autenticado de Supabase y una cookie permite resolver la zona en servidor. Se reutiliza la acción de progreso local para marcar el siguiente episodio consecutivo ya emitido.

Verificaciones: en el navegador sin sesión se inspeccionaron escritorio claro de 1440 px y móvil oscuro de 390 px, sin desborde horizontal. El catálogo de otoño de 2025 cargó al cambiar de año y se volvió a la semana actual con el teclado. En la semana del 2 de noviembre, Ranma apareció una vez el sábado 7, con episodio 6 y enlace a IMDb. Pasaron cuatro pruebas de fechas y deduplicación, dos de progreso concurrente y diez de emisiones de Inicio. El avance desde una pestaña antigua se rechaza si el episodio o el estado cambiaron. Se verificaron lint enfocado y tipos. No se verificó el guardado con una cuenta real ni se publicó esta versión.

### Ajustes visuales del calendario · 4 de noviembre de 2026

El selector segmentado «Lo que sigo / Toda la temporada» precede a las flechas y «Esta semana». La zona horaria se alinea a la derecha en escritorio y los controles se distribuyen en varias filas en móvil. Las columnas no tienen contorno, el encabezado de hoy usa el color primario y las horas de emisión usan el violeta del tema. Se retiró el enlace IMDb de las tarjetas; su presentación en la ficha de detalle queda para esa pantalla.

El contenido de las páginas y la fila principal del navbar comparten el contenedor `page-frame` (max-w-7xl y márgenes adaptables). Se unificaron los márgenes exteriores de rutas y estados de carga, conservando el ancho propio de formularios y tarjetas. Calendario abre directamente en su encabezado. Las emisiones usan títulos de 13 px con un máximo de tres líneas, y hoy tiene un degradado que termina con el contenido de su columna. Los números de los demás días usan el color de texto secundario.

### Identidad y navegación desde el calendario

Las tarjetas ganaron espacio horizontal reduciendo la separación y el padding de las columnas. El selector tiene puntero y hover al estar habilitado. La tarjeta abre la ficha local y destaca el título en primary al pasar el mouse. La acción de progreso conserva su botón propio.

Se combinan títulos y alias de MAL y AniList antes de resolver coincidencias. Para TVmaze se contrasta el ID IMDb con el [índice de equivalencias Fribb/anime-lists](https://github.com/Fribb/anime-lists), cacheado por un día, y con las emisiones de esa semana. Una coincidencia ambigua conserva entradas separadas. Si el índice está inaccesible se usan los alias. Cuando hay ID MAL se abre la ficha habitual; sin él se consulta la emisión por su ID de proveedor en la ruta interna `/anime/emision/[clave]`. Los enlaces de fuentes aparecen en el detalle.

Pasaron las seis pruebas del calendario. En navegador se revisaron los enlaces internos, el puntero y el espacio entre columnas en escritorio y móvil. Se abrió la ficha de «Chibi Godzilla Raids Again» con enlaces a TVmaze e IMDb, y se verificó que Ranma, Chitose y Battle Spirits aparecían una vez en la semana observada.
