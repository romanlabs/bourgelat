# Landing «Petróleo y blanco» — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la landing vieja por una en petróleo y blanco, con pantallas reales del programa, que lleve a crear la cuenta.

**Architecture:** La página `LandingPage.jsx` queda como composición de secciones pequeñas en `components/landing/`. Todo el texto vive en `components/landing/contenido.js`. Las capturas salen de una clínica de demostración local creada con un script de backend propio. El movimiento usa CSS sticky y `useScroll`/`useTransform` de `motion/react`.

**Tech Stack:** React 19, Tailwind 3 con tokens de `index.css`, `motion/react`, lucide-react, Vitest + Testing Library; backend Node/Sequelize para el script; `sharp` (ya está en `backend/node_modules`) para convertir a webp.

**Spec:** `docs/superpowers/specs/2026-11-05-landing-petroleo-design.md`

## Global Constraints

- Único objetivo de conversión: «Crear cuenta» → `/registro`. Se puede decir «30 días de prueba con todo abierto» (`DIAS_PRUEBA = 30`).
- Solo tokens del tema (`bg-primary`, `text-foreground`, `bg-card`, `bg-brand`, `text-brand-foreground`, `bg-sidebar`, estados `-soft`). Ámbar (`brand`) nunca como texto sobre blanco.
- Prohibido en lo tocado: `#2b2018`, `#f8f4ee`, `#b07645`, `papel-*`, `tinta-*`, `caramel-*`, `clinical-*`, paletas crudas (`red-*`, `amber-*`…).
- Títulos en Spectral; el resto en Geist. Landing solo en modo claro.
- DIAN siempre como «próximamente». Nada de clientes, cifras ni logos inventados. Sin precios. Sin perros ilustrados ni personajes.
- Imágenes `.webp`, máx. ~200 KB cada una, en `frontend/public/images/landing/`.
- `prefers-reduced-motion`: nada se mueve con el scroll. Menos de 1024 px: sin sticky ni 3D fuerte.
- Commits con prefijo (`feat(landing):`, `chore(landing):`…), sin atribución a Claude. PR a `develop`.

## Review Focus

1. Celular de 390 px: ninguna sección provoca scroll horizontal (la perspectiva 3D y las tarjetas flotantes son los sospechosos).
2. `prefers-reduced-motion: reduce`: la sección «El programa por dentro» muestra las cuatro pantallas sin depender del scroll.
3. Conexión lenta: la captura del héroe no salta de tamaño al cargar (`width`/`height` fijos) y las demás cargan en diferido.
4. Enlaces del menú (`#producto`, `#como-funciona`, `#preguntas`): llegan a la sección sin quedar tapados por la barra fija.
5. Teclado: el menú, el acordeón de preguntas y los botones tienen foco visible y el acordeón expone `aria-expanded`.

---

### Task 1: Clínica de demostración local

**Files:**
- Create: `backend/src/scripts/clinicaDemoDatos.js` (datos puros, sin BD)
- Create: `backend/src/scripts/clinicaDemoDatos.test.js`
- Create: `backend/src/scripts/crearClinicaDemo.js` (escribe en la BD)
- Modify: `backend/package.json` (script `demo:clinica`; agregar el test a `npm test`)

**Interfaces:**
- Produces: `construirDatosDemo(fechaHoy: string 'YYYY-MM-DD') -> { clinica, usuarios, propietarios, mascotas, citas, historias, productos, movimientosCaja }`; `npm run demo:clinica` crea la clínica con admin `demo@bourgelat.test` y escribe la contraseña generada en `backend/.demo-credenciales` (ignorado por git), nunca en consola ni en chat.

- [ ] **Step 1: Test de datos** en `clinicaDemoDatos.test.js` (estilo `assert` como `borrarCuentaReglas.test.js`):
  - `citas` de `fechaHoy` ≥ 10, todas entre 08:00 y 18:00, sin dos citas solapadas en el mismo consultorio.
  - ≥ 8 propietarios y ≥ 12 mascotas con nombres colombianos creíbles; cada mascota apunta a un propietario existente.
  - ≥ 1 historia con ≥ 2 evoluciones; ≥ 3 productos con stock por debajo del mínimo.
  - Ningún correo fuera del dominio `.test`.
- [ ] **Step 2:** `node src/scripts/clinicaDemoDatos.test.js` → falla (módulo no existe).
- [ ] **Step 3:** Implementar `construirDatosDemo` (determinista, sin `Math.random`).
- [ ] **Step 4:** El test pasa.
- [ ] **Step 5:** Implementar `crearClinicaDemo.js`: aborta si `NODE_ENV === 'production'`; si existe la clínica demo, borra **solo** sus filas (filtrando por su `clinicaId`) y la recrea; consultas marcadas `sinTenant: true` donde toque; suscripción `cortesia`. Agregar `.demo-credenciales` a `backend/.gitignore`.
- [ ] **Step 6:** `npm run demo:clinica` dos veces seguidas → ambas terminan sin error y no tocan otras clínicas (contar filas de otra clínica antes y después).
- [ ] **Step 7: Commit** `feat(scripts): clínica de demostración local para capturas`

### Task 2: Capturas reales en webp

**Files:**
- Create: `frontend/public/images/landing/{agenda,historia,caja,inventario}.webp`
- Create: `frontend/scripts/capturas-a-webp.mjs` (convierte PNG → webp con `sharp`, ancho máx. 1600, calidad ajustada hasta ≤ 200 KB)

**Interfaces:**
- Consumes: credenciales de `backend/.demo-credenciales` (Task 1).
- Produces: las cuatro rutas `/images/landing/<nombre>.webp` con medidas anotadas en el commit (las usa Task 3).

- [ ] **Step 1:** Con los servidores locales y Claude in Chrome, iniciar sesión con la cuenta demo (cuenta de prueba local) a 1440×900, modo claro, y capturar `/agenda` (día de hoy), `/pacientes/:id/historial` (la historia con evoluciones), `/caja`, `/inventario` (con alertas).
- [ ] **Step 2:** `node frontend/scripts/capturas-a-webp.mjs <pngs>` → cuatro webp ≤ 200 KB.
- [ ] **Step 3:** Revisar visualmente cada una: sin datos de clínicas reales, sin errores en pantalla.
- [ ] **Step 4: Commit** `feat(landing): capturas reales del programa`

### Task 3: Contenido y secciones nuevas

**Files:**
- Create: `frontend/src/components/landing/contenido.js`
- Create: `frontend/src/components/landing/contenido.test.js`
- Create: `HeroProducto.jsx`, `ProgramaPorDentro.jsx`, `BandaHechos.jsx`, `PreguntasFrecuentes.jsx`, `CierreRegistro.jsx`, `LandingFooter.jsx` en `frontend/src/components/landing/`
- Modify (reescribir): `LandingNav.jsx`, `WhatsAppFab.jsx`, `BrandMark.jsx`, `frontend/src/pages/LandingPage.jsx`
- Create: `frontend/src/pages/LandingPage.test.jsx`

**Interfaces:**
- Consumes: imágenes de Task 2.
- Produces: `contenido.js` exporta `NAV` (`[{label, href}]` con `#producto`, `#como-funciona`, `#preguntas`), `HERO` (`{titulo, frase, nota}`), `MODULOS` (`[{id, nombre, frase, imagen, alt}]` en orden agenda, historia, caja, inventario), `HECHOS` (3 ítems + DIAN próximamente), `FAQS` (`[{pregunta, respuesta}]`), `CIERRE`. Secciones con ids `producto` (ProgramaPorDentro), `como-funciona` (BandaHechos), `preguntas`.

- [ ] **Step 1: Tests** en `contenido.test.js`: `MODULOS.map(m => m.id)` igual a `['agenda','historia','caja','inventario']`; cada `imagen` existe en `frontend/public` (`fs.existsSync`); `FAQS.length >= 5`; todo texto que mencione «DIAN» incluye «próximamente»; ningún texto contiene «$».
- [ ] **Step 2: Tests** en `LandingPage.test.jsx` (envolver en `MemoryRouter`; mockear `matchMedia` y `IntersectionObserver`): hay exactamente un `h1`; todos los enlaces con nombre «Crear cuenta» apuntan a `/registro`; cada `href` de `NAV` corresponde a un elemento con ese `id`; los botones de preguntas exponen `aria-expanded` y al hacer clic pasa de `false` a `true`; con `matchMedia('(prefers-reduced-motion: reduce)')` en `true` se renderizan las cuatro imágenes de `MODULOS`.
- [ ] **Step 3:** `npx vitest run src/components/landing src/pages/LandingPage.test.jsx` → fallan.
- [ ] **Step 4:** Escribir `contenido.js` y las secciones según el spec. Héroe: captura de agenda con `width`/`height`, `fetchpriority="high"`, inclinada con `perspective` + `rotateX/rotateY` solo en ≥ 1024 px, 2–3 tarjetas flotantes con datos que sí aparecen en la captura. `ProgramaPorDentro`: en ≥ 1024 px y sin reduced motion, contenedor alto con panel sticky; `useScroll({ target })` + `useTransform` eligen la pantalla activa (opacidad/translate, nada de layout); en móvil o reduced motion, lista vertical captura + frase. Footer en `bg-sidebar`, con `legalLinks` y correo. WhatsApp con `pagoManual.whatsapp`.
- [ ] **Step 5:** Los tests pasan; `npm run lint` y `npm run lint:colores` limpios.
- [ ] **Step 6: Commit** `feat(landing): nueva landing en petróleo y blanco`

### Task 4: Foto real

**Files:**
- Create: `frontend/public/images/landing/clinica.webp`
- Modify: `BandaHechos.jsx`

- [ ] **Step 1:** Buscar 3 candidatas en Unsplash/Pexels (veterinario atendiendo, luz natural, sin marcas visibles). Mostrarle a Roman URL, autor, licencia y peso; **descargar solo la que apruebe**.
- [ ] **Step 2:** Convertir con `capturas-a-webp.mjs` (≤ 200 KB) y usarla en `BandaHechos` con `loading="lazy"` y `alt` descriptivo. Mientras no haya foto, la banda usa fondo `bg-primary`.
- [ ] **Step 3: Commit** `feat(landing): foto de la banda` (fuente y autor en el mensaje del commit).

### Task 5: Limpieza y verificación

**Files:**
- Delete (tras `grep` sin referencias): `FlowDog.jsx`, `FlowDogMedic.jsx`, `FlowCarousel.jsx`, `TrustBar.jsx`, `PlatformSection.jsx`, `FooterPulse.jsx`, `SectionHeading.jsx`, `DeviceMockup.jsx`, `useVisible.js`, `data.js` (mover `legalLinks` a `contenido.js` si nadie más lo importa), `public/videos/perroHero.*`, `perroHero-poster.webp`, `footer-loop.mp4`, `public/images/perro-*.webp`, `public/images/flujo/`, `mano-tablet.*`, `bourgelat-pacientes.webp`, `src/assets/landing/*`, y el CSS de `.hero-bg`, `.hero-ecg`, `.contact-dog` en `index.css`.
- No tocar: `login.*`, `perro-registro-*`, `registro-puppy.*`.

- [ ] **Step 1:** Por cada archivo, `grep -rn "<nombre>" frontend/src frontend/index.html` sin resultados → borrar.
- [ ] **Step 2:** `npm run lint && npm run lint:colores && npx vitest run && npm run build` en `frontend/` → todo pasa.
- [ ] **Step 3:** Claude in Chrome a 1280 px y 390 px: recorrer la página completa, comprobar los cinco puntos de Review Focus y que `/login` y `/registro` sigan iguales.
- [ ] **Step 4:** Lighthouse móvil (rendimiento) antes (en `develop`) y después; el después no es peor.
- [ ] **Step 5: Commit** `chore(landing): quitar la landing vieja` → push y PR a `develop` con capturas antes/después.

### Task 6 (PR aparte): páginas públicas y restos de colores viejos

**Files:**
- Modify: `frontend/src/components/shared/PublicPageShell.jsx`, `frontend/src/pages/NosotrosPage.jsx`, `frontend/src/pages/PerfilPage.jsx`, `frontend/src/features/soporte/NuevaSolicitudForm.jsx`
- Branch: `fix/paginas-publicas-tokens` desde `develop` tras mergear la landing.

- [ ] **Step 1:** Reemplazar `papel-*`/`tinta-*`/`caramel-*`/`clinical-*` por tokens; `PublicPageShell` reutiliza `LandingNav` y `LandingFooter`.
- [ ] **Step 2:** `grep -rn "papel-\|tinta-\|caramel-\|clinical-" frontend/src` → sin resultados; si las escalas quedan sin uso, quitarlas de `tailwind.config.cjs`/`theme.tokens.cjs` y actualizar la sección «Dónde se usa cada cosa» de `CLAUDE.md`.
- [ ] **Step 3:** lint, lint:colores, build y revisión en Chrome de `/nosotros`, `/perfil` y `/soporte`.
- [ ] **Step 4: Commit** `fix(estilos): páginas públicas y restos con la paleta vigente` → PR a `develop`.
