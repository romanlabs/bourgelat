# Rediseño de la landing — «Petróleo y blanco»

Fecha: 2026-11-05 · Rama: `feat/landing-petroleo`

## Intención

La landing (`/`) sigue con la identidad vieja (café, crema, caramelo, perros ilustrados y video
del perro), con hex sueltos. Roman quiere un cambio total: la paleta vigente «Petróleo y blanco»,
el programa real como protagonista y una página que una clínica entienda rápido y que se vea
profesional frente a una competencia que ya presume IA. Vienen campañas y videos que llevarán
tráfico aquí, empezando por las 30 clínicas de Neiva y Florencia.

**Éxito:** quien llega entiende en segundos qué es Bourgelat, ve el programa por dentro y crea
la cuenta.

## Metas

- Un solo objetivo de conversión: **Crear cuenta** (`/registro`). Registrarse da 30 días de prueba
  con todo abierto (`DIAS_PRUEBA` en `backend/src/config/planes.js`), y eso se puede decir.
- Pantallas **reales** del programa con datos creíbles como prueba visual, con un toque 3D
  (perspectiva) y movimiento ligado al scroll.
- Sin redundancia: cada sección dice algo que ninguna otra dice.
- Solo tokens del tema (`npm run lint:colores` limpio en lo tocado); tipografía Geist + Spectral
  para títulos.
- Imágenes libres de derechos en `.webp`.

## No metas

- Asistente/chat de IA (proyecto aparte, después). Solo se deja libre la esquina inferior derecha
  que hoy ocupa el botón de WhatsApp.
- Precios en la landing: viven solo en Mi plan (`/plan`).
- Modo oscuro en la landing: va solo en claro.
- Ilustraciones anatómicas o figuras dibujadas a mano (se probó y se descartó).

## Anti-metas (fracaso aunque funcione)

- Que algo diga algo falso: DIAN es «próximamente», nada de clientes, cifras o logos inventados.
- Personajes caricatura, perros ilustrados, jerga técnica.
- Que se vea como plantilla genérica de SaaS o que pese tanto que vaya lento en un celular barato.
- Restos de la paleta vieja (`#2b2018`, `#f8f4ee`, `#b07645`, `papel-*`, `tinta-*`, `caramel-*`,
  `clinical-*`) en lo que se toca.

## Estructura (decidida con Roman)

1. **Barra superior**: Bourgelat · Producto · Cómo funciona · Preguntas · «Iniciar sesión» ·
   botón «Crear cuenta». En móvil, menú compacto.
2. **Primera pantalla**: título (Spectral), una frase, «Crear cuenta» y la nota de 30 días de
   prueba. A la derecha la **agenda real** en perspectiva 3D con dos o tres tarjetas flotantes
   tomadas del programa (p. ej. «Cita confirmada», «Quedan 3 vacunas»). En móvil la captura va
   debajo, plana o con poca inclinación.
3. **El programa por dentro**: sección con pantalla fija (sticky) que cambia entre **Agenda,
   Historia clínica, Caja e Inventario** mientras se baja; al lado, una frase de qué resuelve cada
   una. Reemplaza `TrustBar`, `PlatformSection` y `FlowCarousel`. En móvil: lista vertical de
   bloques captura + frase, sin sticky.
4. **Banda con foto real** (veterinario/clínica, libre de derechos, webp) con tres hechos ciertos:
   en la nube sin instalar, funciona en celular/tablet/computador, hecho en Colombia. DIAN como
   «próximamente».
5. **Preguntas frecuentes**: cómo empiezo y qué incluye la prueba, seguridad de los datos, uso en
   celular, DIAN próximamente, cómo hablar con el equipo.
6. **Cierre**: bloque petróleo con «Crear cuenta».
7. **Pie**: petróleo oscuro (`sidebar`), enlaces legales, correo, «Hecho en Colombia».

Botón flotante de WhatsApp: se queda, restilizado.

## Alcance adicional

- `/nosotros` y `PublicPageShell` a tokens del tema (quitar escalas `papel-*`, `tinta-*`,
  `caramel-*`, `clinical-*`).
- `PerfilPage.jsx` y `features/soporte/NuevaSolicitudForm.jsx`: reemplazar sus restos de esas
  escalas por tokens.
- Borrar componentes y archivos que queden sin uso (perros, video del héroe, `FooterPulse`,
  `FlowDog*`, `TrustBar`, `PlatformSection`, `FlowCarousel`, `DeviceMockup` si nadie más lo usa,
  imágenes de `public/images` y `public/videos` sin referencias). Comprobar con grep antes de
  borrar; `login.mp4`/`perro-registro-*` los usan otras páginas y no se tocan.

## Capturas

- Clínica de demostración **local** creada por script/seed propio (nunca mutar usuarios existentes).
  Nombres de mascotas, tutores y productos creíbles y colombianos; agenda del día llena; una
  historia con evolución; caja con movimientos; inventario con alertas de stock.
- Capturas en escritorio, modo claro, exportadas a `.webp` en `frontend/public/images/landing/`,
  con ancho suficiente para pantallas retina sin pasar de ~200 KB cada una.
- Sin datos reales de clínicas piloto.

## Fotos libres

- Fuente: Unsplash o Pexels (licencia libre de uso comercial, sin atribución obligatoria);
  anotar en el PR de dónde sale cada una. Pedir confirmación a Roman antes de descargar.
- Convertir a webp, máx. ~200 KB.

## Calidad

- `npm run lint`, `npm run lint:colores` y `npm run build` en `frontend/` pasan.
- Revisión en Claude in Chrome a 1280 px y 390 px: sin scroll horizontal, sticky correcto,
  `prefers-reduced-motion` desactiva el movimiento de scroll.
- Rendimiento en móvil no peor que la landing actual.

## Decisiones de construcción (decididas por Claude, Roman puede cambiarlas)

- **Orden y PRs**: PR 1 = la landing completa (secciones, capturas, foto, borrado de lo que quede
  sin uso). PR 2 = `/nosotros`, `PublicPageShell`, `PerfilPage` y `NuevaSolicitudForm` a tokens.
  Así el diff visual no se mezcla con cambios de colores sueltos.
- **Capturas**: las produce Claude (seed local + Claude in Chrome). Las secciones se construyen
  primero con marcadores del mismo tamaño y luego se cambian por las capturas reales.
- **Foto**: la banda se construye con un fondo petróleo de reserva; la foto entra cuando Roman
  apruebe las que se elijan (se le muestran fuente, nombre y peso antes de descargar).
- **Movimiento**: CSS `position: sticky` + `useScroll`/`useTransform` de `motion/react` para el
  cambio de pantallas y la inclinación; solo `transform` y `opacity`. Con
  `prefers-reduced-motion` todo queda quieto. En móvil (<1024 px) no hay sticky ni 3D fuerte.
- **Rendimiento**: se mide con Lighthouse móvil antes y después; capturas con `loading="lazy"`
  salvo la del héroe.
- **Textos**: nuevos, en `components/landing/data.js`. `publicSiteContent.js` no es fuente
  (habla de DIAN como si existiera). WhatsApp sale de `pagoManual.whatsapp`; los enlaces legales,
  de `legalLinks`.

## Queda al criterio de quien construye

Textos finales (en el tono de CLAUDE.md: solo lo cierto), detalle de animaciones, componentes
internos, nombres de archivos, proporciones del 3D.
