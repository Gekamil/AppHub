# Módulos y Diseños Archivados de StudentHub

Este directorio almacena el código fuente completo y los estilos de características que han sido retiradas de la versión activa de StudentHub para aligerar la interfaz, reducir el tamaño del bundle y eliminar lag, pero que quedan preservadas para su restauración o reutilización en el futuro:

## 1. Pestaña de Documentos y Notas (`pages/NotebooksPage.jsx`)
- Editor enriquecido WYSIWYG basado en BlockNote (`@blocknote/react` y `@blocknote/core`).
- Sistema de carpetas para asignaturas y proyectos personales.
- Marcadores de favoritos, atajos de teclado y sincronización.

## 2. Pestaña My Hub (`pages/MyHubPage.jsx`)
- Directorio de enlaces rápidos, marcadores web y recursos universitarios.
- Fast Web Clipper para captura de enlaces externos y notas rápidas.

## 3. Tema Profesional Ejecutivo (`themes/executiveTheme.js` y `themes/executiveTheme.css`)
- Configuración de tema con paleta de tonos pizarra/grafito (`#334155`), tipografía Plus Jakarta Sans y bordes sutiles de 8px.
- Reglas CSS correspondientes a `html[data-theme-style="executive"]`.
