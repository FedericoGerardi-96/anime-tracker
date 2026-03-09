# Paleta de colores (usar exactamente estos valores)

- Deep Navy — #19322F (Fondo general de la aplicación)
- Electric Purple — #8D31E3 (Color primario, botones de acción, bordes activos)
- Slate Dark — #161B22 (Fondo de la sidebar y contenedores principales)
- Glass Card — rgba(30, 41, 59, 0.5) (Tarjetas con efecto de desenfoque (backdrop-blur))
- Text Primary - #F8FAFC (Títulos y texto de alta jerarquía)
- Text Muted - #94A3B8 (Descripciones, stats y texto secundario)
- Accent Gold - #EAB308 (Estrellas de calificación y medallas)

- Fondo principal: Clear Day
- Botones primarios: Mosque
- Headers / navegación: SF Pro Display
- Tarjetas destacadas: Hint of Green
- Texto principal: SF Pro Display

# Tipografía

- Uso obligatorio de SF Pro Display

# Prioridades

- Trabaja pensando en reutilizar componentes y estilos.
- Crea componentes para las tarjetas o cualquier elemento que se repita
- Maneja carpetas y subcarpetas acorde a las páginas que estás trabajando
- No hagas configuraciones ni instalaciones de librerías sin consultar primero.

# Estructura Recomendada del Proyecto (Next.js)

src/
├── app/                  # App Router de Next.js
│   ├── (auth)/           # Grupo de rutas para login/registro
│   ├── dashboard/        # Página principal
│   ├── anime/            # Listado y detalle de anime
│   └── manga/            # Listado y detalle de manga
├── components/           # Componentes atómicos y moleculares
│   ├── ui/               # Botones, inputs, modales (Shadcn/ui style)
│   ├── shared/           # Sidebar, Navbar, Footer
│   └── cards/            # AnimeCard, ActivityCard, ListCard
├── hooks/                # Lógica de Supabase y MyAnimeList API
├── lib/                  # Configuraciones (supabaseClient, utils)
└── types/                # Definiciones de TypeScript para tu DB