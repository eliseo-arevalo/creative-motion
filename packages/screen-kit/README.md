# @eliseo-arevalo/screen-kit

Videos de usabilidad y demos de producto para cualquier web app. **Playwright captura la UI real** (estados en hi‑DPI + bounding boxes) y **Remotion compone** cámara virtual, cursor sintético, marco de clic, ripple, callouts y keycaps. Todo sale de un JSON por escena. Un **lint narrativo** revisa ritmo, continuidad y legibilidad antes de renderizar.

Reglas de narrativa e investigación con fuentes: [`docs/USABILITY-VIDEOS.md`](../../docs/USABILITY-VIDEOS.md). Ejemplo mínimo: [`examples/demo-usability`](../../examples/demo-usability).

## Qué trae

| Ruta | Qué es |
|---|---|
| `src/UsabilityComposition.tsx` | `<UsabilityComposition defaultSceneId="…"/>`: la composición genérica para el `Root.tsx` del proyecto. Lee `<captures>/<id>/{scene,manifest}.json` |
| `src/UsabilityScene.tsx` | la escena: cámara, `StateStack`, overlays |
| `src/components/` | `Camera`, `Cursor`, `ClickFrame` (marco de acento en cada clic), `Ripple`, `Callout`, `Highlight`, `Keycap`, `StateStack` (crossfades y flipbook de scroll), `TextOverlay`, `Wipe` |
| `src/geometry.ts`, `src/pacing.ts`, `src/theme.ts`, `src/types.ts` | cámara (`ease`, `spring`, `zone`, `cut`, `wipe`), presets `snappy`/`calm`/`gentle`, tema por defecto, tipos |
| `capture/capture.mjs` → bin `screen-kit-capture` | captura con Playwright, guiada por el bloque `capture` de la escena |
| `scripts/render.mjs` → bin `screen-kit-render` | copia la escena, corre el lint y renderiza con el Remotion CLI del proyecto |
| `scripts/lint.mjs` → bin `screen-kit-lint`, `import { lint } from '@eliseo-arevalo/screen-kit/lint'` | lint narrativo |

**Tema y acento.** El color de énfasis (marco de clic, ripple, callouts, keycap) va en `scene.composition.theme.accent`, junto con `accentInk`, `ink`, `font` y `monoFont`. Por defecto (`DEFAULT_THEME`) es azul `#2563EB` con fuente del sistema. Cada proyecto pone su marca.

## Uso en un proyecto

`package.json` del proyecto: `@eliseo-arevalo/screen-kit` + peers `remotion`, `@remotion/cli`, `react`, `react-dom` (4.0.529 / 19.2.3) y `playwright` (1.64.0, para capturar).

```tsx
// src/Root.tsx
import { UsabilityComposition } from '@eliseo-arevalo/screen-kit';
export const Root = () => <UsabilityComposition defaultSceneId="tour" />;
```

```bash
screen-kit-capture scenes/<id>.json [--captures=public] [--no-video]   # → <captures>/<id>/
screen-kit-render <id> [--captures=public] [--scenes=scenes] [--entry=src/index.ts] [--concurrency=4] [--strict]
screen-kit-render <id> --still=150                                      # PNG de un frame
screen-kit-lint <id> [--captures=public] [--scenes=scenes] [--strict]
```

Si usás otra carpeta de capturas (p. ej. `captures/`), poné `Config.setPublicDir('captures')` en `remotion.config.ts` para el Studio; `screen-kit-render` ya pasa `--public-dir`. Los CLIs resuelven `playwright` y `@remotion/cli` **desde el proyecto** (cwd), así hay una sola copia de remotion/react. Si el paquete está enlazado por symlink (`file:`), agregá en `remotion.config.ts` `resolve.symlinks = false` o alias de `react`/`remotion` (ver `examples/demo-usability/remotion.config.ts`).

Si cambiás **solo el timeline** (`composition`), no hace falta volver a capturar: `screen-kit-render` copia el JSON a `<captures>/<id>/scene.json`. Si cambiás **la UI o `capture`**, volvé a capturar.

## Requisitos

- Node ≥ 18 y Google Chrome (o `npx playwright install chromium`; para forzar Chromium: `PW_CHANNEL=chromium`).
- `npx playwright install ffmpeg` solo si usás la pasada de `recordVideo`.
- Remotion descarga su propio chrome-headless-shell en el primer render.

## El JSON de escena

**`capture`**
| Campo | Qué hace |
|---|---|
| `url`, `viewport`, `deviceScaleFactor` (2), `locale`, `colorScheme` | contexto del navegador |
| `localStorage` | se inyecta antes de cargar (tema, idioma, paneles…) |
| `css` | CSS opcional inyectado (usalo con cuidado: no "maquillar" la app) |
| `assert` | expresiones JS que deben cumplirse (p. ej. `dataset.theme == 'light'`) |
| `fontCheck` | selector + familia esperada; verifica `getComputedStyle` y `document.fonts.check` |
| `setup` | acciones previas: `goto, waitForSelector, hover, click, press, type, mouseMove, scroll, blur, eval, wait` |
| `deviceScaleFactor` | 2 por defecto; 3 si algún plano hace zoom > 2x |
| `states` | lista de estados; cada uno ejecuta sus acciones y guarda `<name>.png` (acumulativo, misma sesión) |
| `states[].dpr` | DPR propio del estado (vía CDP `Emulation.setDeviceMetricsOverride`, solo Chromium) |
| `states[].scrollSequence` | `{container, frames}`: tras la acción real (p. ej. clic en una pestaña que hace scroll), re-renderiza N posiciones intermedias con easing → `name~01..` para reproducir el scroll real cuadro a cuadro |
| `stateProbe` | expresión JS evaluada después de cada estado y guardada en el manifest (p. ej. ruta y título del detalle) para verificar que el estado sea el esperado |
| `targets` | nombre → `"sel"` (primer match) \| `["selA","selB"]` (unión) \| `{selector, all:true}` (unión de todos). Se miden **en cada estado** (`manifest.states[].boxes`) |
| `video` | pasada opcional con `recordVideo` (solo para comparar) |

Después de cada acción se espera `networkidle`, `document.fonts.ready`, el fin de las animaciones CSS finitas (`document.getAnimations()`) y dos `requestAnimationFrame`.

**`composition.timeline`** (frames)
- `pacing`: `"snappy"` (cámara 16, zona 24, cursor 18, crossfade 3, callout 12/8, wipe 10) o `"calm"` (45/40/4/26/14/16). Rige toda duración que omitas.
- `wideScale`, `maxScale`: escala del plano general (página como ventana) y tope de zoom.
- `camera`: `[{at, to, transition, duration, wipeFrames, direction}]`
  - `to` = `"wide"` | `"full"` | `{wide, dx, dy}` | `{target, padding, scale, maxScale, dx, dy}` | `{rect, padding}`
  - `transition` = `"ease"` (recomendado; `easing: cubic|sine`) | `"spring"` (por defecto por compatibilidad) | `"zone"` (cambio de zona continuo con punto medio alejado automático; duración por defecto: snappy 24, calm 40) | `"cut"` / `"wipe"` (solo para cambios de escena o de capítulo, nunca entre zonas de la misma pantalla; el lint lo marca)
- Referencias a targets: `"name"` (medido en el primer estado) o `"name@estado"` (p. ej. `lineageSection@lineage` después de un scroll).
- `states`: `[{at, name, crossfadeFrames, playFrames}]`. `playFrames` reproduce la `scrollSequence` capturada.
- `cursors`: `[{appearAt, hideAt, start, moves:[{at, duration, to, arc}], clicks:[frame], hovers:[frame]}]` (`cursor` único sigue funcionando). Cada clic dibuja un anillo de acento alrededor del target y un ripple; cada hover, solo el anillo.
- `keys`: `[{at, key}]` (`ArrowDown`, `ArrowRight`, `Enter`…) → keycap abajo al centro, que se hunde en cada pulsación.
- `theme`: `{accent, accentInk, ink, font, monoFont}`.
- `states[].crossfadeFrames`: 3 para cambios de énfasis (copian la transición CSS) y 1 para cambios de layout (cambiar de familia, agregar o quitar columna, navegar), para que no haya imagen fantasma.
- `ripples`, `highlights`: anclados a `target`.
- `callouts`: `{at, duration, target, label, side: below|above|left|right, lead, padding, out}`. `out:false` evita el wipe de salida cuando lo corta un wipe de sección.
- `texts`: overlays limpios en pantalla `{at, text, x, y, size, weight, mono}` (p. ej. la URL del cierre).

## Receta para otra app

1. Abrí la app y buscá cómo guarda tema/idioma (localStorage, cookie, ruta `/es/`, clase en `<html>`). Si se puede, leé el repo en solo lectura.
2. Encontrá un **estado neutro** de inicio. Si la app siempre tiene algo seleccionado, elegí un elemento sin efectos visuales.
3. Definí `targets` con selectores específicos (`.card[data-key=…]`; ojo, un `[data-key]` suelto puede caer en un `<path>` SVG).
4. Capturá, revisá `manifest.json` → `report` (asserts y fuentes en `ok: true`) y abrí los PNG.
5. Ajustá el timeline con stills (`--still=N`) y renderizá.

## Gotchas aprendidos

- No renderices muchos stills 3x en paralelo (8 a la vez colgaron uno). Hacelos de a 2 o 3.

- **recordVideo no sirve como fuente final**: graba a 25 fps, con 1x y compresión VP8. En la prueba, de 169 frames solo 49 eran distintos (entrecortado), salió borroso al hacer zoom 1.5x y no dibuja el cursor. Los screenshots 2x + composición quedan nítidos hasta unos 2x de zoom.
- La detección de idioma puede depender de la geo del edge (Vercel). Forzalo con storage/ruta y no te fíes del `locale`.
- `page.screenshot({animations:'disabled'})` congela las transiciones. Igual conviene esperar con `settle` para capturar el estado final.
- El cursor queda en espacio de pantalla y crece solo un 35 % del zoom. 1:1 se ve gigante.
- El zoom no debe pasar de unos 2x con DPR 2. Para más, usá `deviceScaleFactor: 3` (PNG de 5760×3240, ~600 KB) y renderizá con `--concurrency=4` para no agotar la memoria.
- Si un clic hace scroll suave, `settle` espera a que todos los contenedores dejen de moverse. Las posiciones de los targets cambian con el scroll: usá `name@estado`.
- Con callouts en barras superiores, escalonalos con `lead` distintos para que las etiquetas no se pisen con lo que hay debajo (p. ej. la leyenda).
- Transiciones de escena: wipes/máscaras. El cambio de estado de la UI sí usa el fade corto del CSS real, porque es fiel a la app.
- Las fuentes que carga la página se descargan a `<captures>/<id>/fonts/` para usarlas en callouts. Revisá su licencia (Geist = OFL).
