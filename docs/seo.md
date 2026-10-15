# SEO del sitio público

El frontend es un SPA que sirve el mismo Static Site de Render en `bourgelat.co`
(sitio público) y `app.bourgelat.co` (la app). Para que Google indexe bien el
sitio público:

- **Fuente única**: `frontend/src/content/seo.js` (`RUTAS_PUBLICAS`) define title,
  description, `changefreq` y `priority` de cada página indexable.
- **Build**: el plugin `bourgelat:seo-estatico` de `frontend/vite.config.js` escribe
  `dist/<ruta>/index.html` con el `<head>` propio de cada ruta (title, description,
  canonical, og:*, twitter:*) y genera `dist/sitemap.xml` con la fecha del build.
  Si falta una etiqueta en `index.html`, el build falla en vez de publicar
  páginas con el head de la landing.
- **Navegador**: `aplicarSeo` (`frontend/src/lib/seo.js`) corre en el layout raíz
  del router en cada cambio de ruta. Las rutas de `RUTAS_PUBLICAS` en
  `bourgelat.co` quedan `index, follow`; todo lo demás (app, login, 404 y
  cualquier ruta en `app.bourgelat.co`) queda `noindex, nofollow`.
- **Canonical**: siempre apunta a `https://bourgelat.co<ruta>`, sin importar el host.
- **404**: las rutas desconocidas muestran `NoEncontradaPage` con `noindex`. Render
  responde 200 a todo (rewrite al SPA); el `noindex` evita el soft 404.

## Agregar una página pública

1. Agregar la ruta en `RUTAS_PUBLICAS` (`frontend/src/content/seo.js`).
2. Agregar su rewrite en `render.yaml`, antes del catch-all `/*`:
   ```yaml
   - type: rewrite
     source: /nueva-ruta
     destination: /nueva-ruta/index.html
   ```
   `src/lib/seo.test.js` falla si falta.
3. No poner `document.title` en la página: lo pone `aplicarSeo`.

## Pasos manuales (una sola vez)

### Cloudflare: `noindex` en la app

Render no puede mandar headers distintos por dominio (los dos comparten el
Static Site), así que el `X-Robots-Tag` se pone en Cloudflare:

1. Cloudflare → `bourgelat.co` → **Rules → Transform Rules → Modify Response Header**.
2. Crear una regla «noindex app»:
   - Cuando: `Hostname` equals `app.bourgelat.co`.
   - Acción: **Set static**, header `X-Robots-Tag`, valor `noindex, nofollow`.
3. Verificar: `curl -sI https://app.bourgelat.co/planes | grep -i x-robots-tag`.
   `curl -sI https://bourgelat.co/planes` **no** debe traerlo.

### Google Search Console

1. Agregar la propiedad de dominio `bourgelat.co` (verificación por DNS TXT en
   Cloudflare).
2. **Sitemaps** → enviar `https://bourgelat.co/sitemap.xml`.
3. **Inspección de URL** → `https://bourgelat.co/` y `/planes` → «Probar URL
   publicada» → «Ver página probada». Si la captura muestra el contenido de la
   landing, Google renderiza bien el SPA y el prerender del cuerpo no es urgente.
   Si sale vacía o incompleta, el prerender pasa a ser prioridad.

### Vista previa social

Pasar `https://bourgelat.co/` y `/planes` por el
[Sharing Debugger de Facebook](https://developers.facebook.com/tools/debug/)
(«Volver a extraer») para que WhatsApp y Facebook tomen `og-image.png`.

## Pendiente

- Prerender del cuerpo de las páginas públicas (decidir con Search Console).
- Optimización de imágenes y fuentes (Core Web Vitals).
