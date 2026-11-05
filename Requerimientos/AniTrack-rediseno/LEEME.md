# AniTrack · Rediseño

Propuesta de identidad visual y UX para AniTrack. El lienzo original está en Claude Design; este paquete es una copia para verlo sin Claude.

## Qué hay en la carpeta

- **pantallas/**: cada tablero como página HTML. Abrilas con doble clic en cualquier navegador (necesitan internet para cargar las tipografías). Las marcadas como interactivas responden a los clics.
- **capturas/**: las mismas pantallas en PNG, para mirarlas rápido o pasarlas por chat.
- **codigo/temas.css**: los tres temas listos para reemplazar los bloques `:root` y `.dark` de `src/app/globals.css`. Usa los mismos nombres de variables que ya tiene el proyecto.

| Archivo | Qué muestra |
|---|---|
| 01-identidad | Logo, paleta, tipografías y componentes base |
| 02-cards-interactivas | Card con estado y +1 sin entrar a la ficha, y selección múltiple (interactiva) |
| 03 a 05-tema-… | Ajustes › Apariencia con cada tema aplicado (interactiva) |
| 06-inicio | Inicio logueado: seguir viendo, hoy, recomendaciones de amigos |
| 07-listas | Listas como centro del sitio: biblioteca, listas propias y de amigos, ruleta, tipos de lista |
| 08-catalogo | Catálogo con barra de filtros en lugar del sidebar |
| 09-compartir-lista | Compartir una lista: privacidad, link y vista previa en chat (interactiva) |
| 10-lista-compartida-vista-amigo | La lista vista por otra persona: Seguir o Hacer una copia (interactiva) |
| 11-calendario | Semana con horarios en hora local |
| 12-ficha-anime | Ficha con estado, contador de episodios y listas en un popover |
| 13-perfil | Perfil público; los ajustes pasan a una página aparte |

Las portadas son espacios neutros con la etiqueta “Portada”: en el sitio real va la imagen de AniList o MAL.

## Auditoría del sitio actual (resumen)

1. **Favoritos está mal nombrado.** La tabla `favorites` es en realidad la biblioteca (todo lo que se sigue, con estado y episodio). Por eso la ficha dice “Añadir a favoritos” y el calendario filtra por favoritos. Propuesta: **Biblioteca** = todo lo que tiene estado; **♥ Me encanta** = gusto real, alimenta el Top del perfil.
2. **Identidad genérica**: violeta por defecto de Tailwind, Inter, ícono de claqueta y textos mezclados en inglés (Add to List, Airing, Adult Content, MEMBER, Save Selection).
3. **Demasiados accesos para lo mismo**: en la card hay + y ♥; en la ficha, split-button, botón de listas y campo EP; el modal junta listas, progreso y estado con un solo “Save Selection”.
4. **Para cargar muchas series**: selección múltiple en las grillas y el importador de MAL/AniList (ya existe en el código) bien visible.
5. **Filtros repetidos**: el mismo sidebar de 12 acordeones en Catálogo, Listas y Favoritos. Propuesta: una barra de filtros única como componente compartido.
6. **Perfil mezcla vista pública y ajustes.** Propuesta: perfil público + página de Ajustes.
7. **Calendario sin horarios.** MAL trae `broadcast.start_time` (hora de Japón) y AniList `nextAiringEpisode.airingAt`; convertir a la zona del usuario.

## Notas de implementación

- **Temas**: `<html data-theme="…">`, valor guardado en el perfil. “Automático” usa `prefers-color-scheme` para alternar entre las dos Auroras.
- **Texto sobre colores claros** (menta, naranja, amarillo): siempre oscuro. El blanco va solo sobre superficies oscuras.
- **Listas compartidas**: a `lists` sumar `visibility` (`private | link | public`) y un `share_slug`; tabla nueva `list_follows (user_id, list_id)`; las copias guardan `copied_from_list_id` para la atribución. La imagen de vista previa del link se genera con Open Graph (`opengraph-image` de Next).
- **Calendario**: traer `nextAiringEpisode { airingAt episode }` en la consulta de temporada de AniList.
