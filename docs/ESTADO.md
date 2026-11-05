# Estado de AniTrack y continuidad entre chats

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
- Transición de temas a Aurora nocturna, Aurora clara, Estreno y automático; persistir en `profiles.theme` requiere trabajo de datos posterior a la base visual.
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

Con sesión, el panel consulta todos los anime guardados en `favorites` (la biblioteca actual), no solo las tres tarjetas aleatorias de Viendo. Cruza sus ID MAL con los horarios públicos de la ventana y muestra «Hoy» si encuentra emisiones en el día local. Si no encuentra ninguna, muestra la próxima emisión futura cuya temporada y año de estreno en AniList coinciden con la temporada local actual. No presupone que una serie de una temporada anterior pertenece a la actual aunque continúe en emisión. Los títulos sin correspondencia MAL o sin temporada/horario informado por el proveedor pueden quedar fuera. La ventana pública se limita a 200 registros y AniList no garantiza emisiones pasadas: se indica si está incompleta y no se presenta la alternativa como definitiva si la consulta resulta parcial. Una falla de proveedor muestra un mensaje recuperable. La consulta privada de episodios se agrupa en tandas de hasta 40 y no utiliza caché compartida; no se alteraron guardado ni sincronización.

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

La hora automática se detecta en el navegador. En Perfil → Preferencias → Hora del calendario se puede elegir una zona IANA o volver al modo automático. La preferencia explícita se guarda en los metadatos del usuario autenticado de Supabase y una cookie permite resolver la zona en servidor. Se reutiliza la acción de progreso local para marcar el siguiente episodio consecutivo ya emitido.

Verificaciones: en el navegador sin sesión se inspeccionaron escritorio claro de 1440 px y móvil oscuro de 390 px, sin desborde horizontal. El catálogo de otoño de 2025 cargó al cambiar de año y se volvió a la semana actual con el teclado. En la semana del 2 de noviembre, Ranma apareció una vez el sábado 7, con episodio 6 y enlace a IMDb. Pasaron cuatro pruebas de fechas y deduplicación, dos de progreso concurrente y diez de emisiones de Inicio. El avance desde una pestaña antigua se rechaza si el episodio o el estado cambiaron. Se verificaron lint enfocado y tipos. No se verificó el guardado con una cuenta real ni se publicó esta versión.

### Ajustes visuales del calendario · 4 de noviembre de 2026

El selector segmentado «Lo que sigo / Toda la temporada» precede a las flechas y «Esta semana». La zona horaria se alinea a la derecha en escritorio y los controles se distribuyen en varias filas en móvil. Las columnas no tienen contorno, el encabezado de hoy usa el color primario y las horas de emisión usan el violeta del tema. Se retiró el enlace IMDb de las tarjetas; su presentación en la ficha de detalle queda para esa pantalla.

El contenido de las páginas y la fila principal del navbar comparten el contenedor `page-frame` (max-w-7xl y márgenes adaptables). Se unificaron los márgenes exteriores de rutas y estados de carga, conservando el ancho propio de formularios y tarjetas. Calendario abre directamente en su encabezado. Las emisiones usan títulos de 13 px con un máximo de tres líneas, y hoy tiene un degradado que termina con el contenido de su columna. Los números de los demás días usan el color de texto secundario.

### Identidad y navegación desde el calendario

Las tarjetas ganaron espacio horizontal reduciendo la separación y el padding de las columnas. El selector tiene puntero y hover al estar habilitado. La tarjeta abre la ficha local y destaca el título en primary al pasar el mouse. La acción de progreso conserva su botón propio.

Se combinan títulos y alias de MAL y AniList antes de resolver coincidencias. Para TVmaze se contrasta el ID IMDb con el [índice de equivalencias Fribb/anime-lists](https://github.com/Fribb/anime-lists), cacheado por un día, y con las emisiones de esa semana. Una coincidencia ambigua conserva entradas separadas. Si el índice está inaccesible se usan los alias. Cuando hay ID MAL se abre la ficha habitual; sin él se consulta la emisión por su ID de proveedor en la ruta interna `/anime/emision/[clave]`. Los enlaces de fuentes aparecen en el detalle.

Pasaron las seis pruebas del calendario. En navegador se revisaron los enlaces internos, el puntero y el espacio entre columnas en escritorio y móvil. Se abrió la ficha de «Chibi Godzilla Raids Again» con enlaces a TVmaze e IMDb, y se verificó que Ranma, Chitose y Battle Spirits aparecían una vez en la semana observada.
