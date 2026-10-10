# Videos de usabilidad: reglas de narrativa

Guía para `@eliseo-arevalo/screen-kit`. Las reglas salen de cinco rondas de feedback sobre un tour real (v1 → v5) y de la investigación de abajo. Casi todas las verifica `screen-kit-lint`. API y formato de escena: [`packages/screen-kit/README.md`](../packages/screen-kit/README.md).

**Resumen en una línea:** pocas acciones (≤ 2 cada 10 s), cada clic con su resultado visible en el mismo cuadro, la cámara quieta mientras pasa algo, zoom solo donde hay que leer (1,5–1,6x, ≤ 3 por minuto) y pausas de lectura según la cantidad de palabras.

## Reglas de narrativa (las verifica `screen-kit-lint`)

0. **Ritmo de usuario real (v4).** El video arranca al **100 %**, con la página llenando el cuadro y sin ventana. Los zooms son moderados (techo `maxZoom` 1,8, usá 1,3 a 1,6) y se vuelve a 100 % o cerca entre zonas. Los movimientos usan `transition: "ease"` (easeInOutCubic o `easing: "sine"`, sin spring) o `"zone"`, de **30 a 45 frames**. Cada estado nuevo se deja leer **≥ 30 frames**. El cursor se mueve, se detiene unos 14 frames con una leve deriva (`drift`, 2 a 3 px), mira y recién entonces hace clic. Si no entra en el presupuesto, cortá beats antes que apurar. Preset: `pacing: "gentle"` (cámara 36, zona 40, cursor 26).

1. **Continuidad espacial.** Todo cambio de zona es un movimiento de cámara continuo y legible. Para zonas lejanas usá `transition: "zone"`: aleja brevemente hasta un punto medio que muestra ambas zonas y vuelve a acercar, en 20 a 28 frames con ease in/out. Para zonas cercanas alcanza con un `spring` directo. **Nada de cuts ni wipes entre zonas distantes**: el espectador tiene que saber siempre en qué parte de la pantalla está.
2. **Ningún tramo cambia la escala más de 2x.** `zone` limita el punto medio a ≥ max(sA,sB)/2.
3. **Cursor siempre visible.** Toda interacción la hace el cursor sintético: viaja, hace clic (se encoge más el ripple) y 2 frames después entra el estado real capturado. Un hover también es un viaje del cursor.
4. **Explicaciones mínimas.** Como mucho 1 o 2 callouts en todo el video; el resto lo cuentan la cámara, el cursor y la UI real. Un texto de cierre (URL) está permitido.
5. **Énfasis = objetivo del clic.** Cualquier caja, callout o ripple activo cerca de un clic o hover tiene que estar sobre **el mismo elemento** que el cursor. **Todo clic** dibuja un marco violeta sobre su target, con relleno tenue: aparece cuando llega el cursor, se mantiene unos 20 frames después del clic y se retrae. Se suma el ripple. Los hovers llevan solo el anillo. Todo sale del destino del último movimiento del cursor, así que nunca puede divergir. Tampoco se mueve el cursor a otro elemento mientras hay un callout visible.
6. **Color de acento.** El énfasis (cajas, callouts, anillo y ripple) usa `composition.theme.accent`, no el color principal del sitio. Elegí un tono que no choque con los acentos de categoría de la app. Ejemplo: si la app usa verde, azul, ámbar y rojo, y negro como color principal, un violeta (`#7B2FF7`) contrasta sin confundirse con ninguna categoría.
7. **Teclado.** Las teclas se muestran con un keycap discreto abajo al centro (`timeline.keys`), sin callout. El cursor queda visible pero quieto, fuera de la matriz, para que no haya hover. Antes de las teclas hacé `blur` en la captura: si no, el anillo de foco del último clic queda sobre otro ítem.
9. **Reglas de investigación (v5, ver la sección de investigación más abajo, con fuentes):**
   - **Pocas acciones:** como mucho 2 acciones (clic, hover o tecla) por cada 10 s, tanto en cualquier ventana como en promedio (`maxActionsPer10s`). Una sola historia más, como mucho, una función secundaria. Un hover que no cambia nada visible no cuenta como acción y se corta.
   - **Pocos zooms:** como mucho 3 zoom-ins por minuto, prorrateado y con un mínimo de 1 (`maxZoomInsPerMin`); un `zone` también cuenta. Hacé zoom solo donde hay texto para leer. Lo demás se ve al 100 %.
   - **Cámara o acción, nunca las dos:** la cámara tiene que estar quieta entre 6 frames antes y 20 frames después de cada acción (`stillOnAction`). El orden es mover, asentarse y actuar.
   - **El resultado en el cuadro:** declarale `"result": "<target>"` a un estado y el lint verifica que ese elemento esté dentro del cuadro ya asentado justo después de la acción (`resultInView`). Si el clic y su resultado están lejos, hacé el clic al 100 % y recién después acercá para leer.
   - **Pausa de lectura:** a una key de cámara ponele `"read": <palabras>`, contando solo las palabras que importan. La cámara queda quieta al menos max(60 f, palabras ÷ 3 por segundo) (`minReadHold`, `readingWps`). Los callouts y textos duran al menos max(36 f, palabras ÷ 3 por segundo + 0,5 s) y tienen como mucho 60 caracteres (`minTextHold`, `maxLabelChars`).
8. **Interacciones reales.** Si mostrás un clic en un control, el estado resultante tiene que estar capturado. Podés hacer clic y después restaurar (p. ej. chip 2017 on/off).

`node scripts/lint.mjs <id>` avisa de: cut/wipe entre zonas lejanas (> 0,25 vistas), `spring` con paneo > 0,6 vistas, escala > 2x en un tramo, más de `maxCallouts` callouts, cursor oculto, cambios de estado sin clic, llegada del cursor o tecla cerca (±8 frames), **video que no empieza a escala 1,0** (`startScale`), **zoom por encima de `maxZoom`** (1,8), **movimientos de cámara de menos de `minMove` frames** (30), **estados visibles menos de `minHold` frames** antes del siguiente (30), **clics sin marco** (coordenadas sueltas o un target sin caja medida), **callout, highlight o ripple activo a ±15 frames de un clic o hover con otro target**, **cursor viajando a otro elemento con un callout visible** y clics sobre coordenadas sueltas en vez de un target con nombre. **Reglas de investigación:** más de 2 acciones cada 10 s, más zoom-ins que el presupuesto, la cámara en movimiento alrededor de una acción, el resultado fuera del cuadro, pausa de lectura corta, y textos cortos en tiempo o largos en caracteres. `screen-kit-render` lo corre siempre; con `--strict` aborta. Para ajustar las reglas: `timeline.rules = {continuity, maxCallouts, cursorAlways, maxScaleRatio, emphasisMatchesClick, clickFrames, startScale, maxZoom, minHold, minMove, maxActionsPer10s, maxZoomInsPerMin, stillOnAction, resultInView, readingWps, minTextHold, maxLabelChars, minReadHold}`. `timeline.zoneFloor` (por defecto 1): en un movimiento `zone` no se aleja por debajo de 100 % cuando los dos extremos están por encima, para no mostrar lo que hay fuera de la página.

**Builder de timeline.** Para escenas largas conviene un script con un reloj corriente (un `*.build.py` o `*.build.mjs` que escribe el bloque `composition`): cambiar una pausa corre todo lo que viene después y evita calcular frames a mano.

## Investigación: cómo se hacen los buenos demos de producto (en inglés, con fuentes)

Collected 2026-10-10 for screen-kit. Each rule cites its source. **Kit rule** says how the rule is applied: a lint check in `scripts/lint.mjs` or a README rule.

> Caveat: Linear, Raycast, Arc, Vercel and Framer don't publish how they make their films. What we know about Linear comes from public teardowns of the published films (cited below). The numbers come from tool vendors (Screen Studio, Tella, Arcade, Supademo, Screenify, Tenzen), from subtitle standards (BBC, Netflix, TED) and from launch guides (YC, Product Hunt). Treat vendor numbers as practitioner heuristics, not science.

### 1. Length and scope

| Finding | Source |
|---|---|
| Social, ads and landing-page hero: under 60 s. About 68 % of viewers finish a demo under a minute, versus about 20 % past 10 min. "Show a real workflow, not a feature tour." | https://www.flowjam.com/blog/startup-product-demo-video |
| Top-of-funnel demo: 60–90 s. Cut every loading screen and dead click. "No single shot lasting more than 8 seconds." | https://greenfroglabs.com/blog/software-demo-videos |
| Show the core 20 % of features that carry 80 % of the value. Cramming in every feature dilutes the message. | https://www.videopulse.io/blog/how-to-create-high-converting-saas-demo-videos-2025-guide |
| Linear release films: about 30 s, "one change gets one film; it does not become a tour", "one idea per scene". | https://frame24.app/blog/how-linear-makes-launch-videos · https://impractical.ai/launch-videos/linear-linear-releases |
| YC demo: real end-to-end use case, no feature tour, product on screen immediately. 60–90 s is plenty. | https://ycinsight.com/answers/yc-demo-video-what-partners-look-for · https://www.reddit.com/r/ycombinator/comments/1sttfhp/best_practices_for_the_yc_product_demo_video_what/ |
| Product Hunt video: about 45–60 s, core workflow, one benefit, the result. No logo intro, no dead pauses, must work muted. | https://getreely.co/blog/product-hunt-launch-video · https://supaintro.com/guides/product-hunt-launch-video |
| Public Remotion skill for SaaS demos targets 20–45 s films. | https://github.com/noamdorr/saas-product-demo-video |

**Kit rule:** 20–40 s per usability clip. Show one story: the core loop and at most one secondary feature. Leave everything else out.

### 2. Number of actions

| Finding | Source |
|---|---|
| Interactive demos: 9–12 steps peak completion. The top 1 % of demos have 16 % fewer steps than the median. Those are click-through demos lasting minutes, so for a 30 s video the equivalent is 2–4 actions. | https://www.arcade.software/post/2026-arcade-benchmarks · https://www.arcade.software/post/interactive-demo-statistics |
| One action or idea per step. | https://supademo.com/academy/create-your-demo/recording-best-practices |
| Pause between steps so viewers can process what happened. | https://clickup.com/blog/how-to-create-product-demo-video/ |
| Delete zooms on "housekeeping" clicks (closing dialogs and the like). Only clicks that change something the viewer cares about deserve emphasis. | https://tenzen.studio/blog/smooth-zoom-pan-screen-recording/ |

**Kit rule:** lint `maxActionsPer10s` (default **2**), counting clicks, hovers and key presses, both in any 10 s window and as a whole-video average. Every action must produce a visible result. A hover that changes nothing is not an action worth showing.

### 3. Camera: zoom level, frequency and motion

| Finding | Source |
|---|---|
| "Three zoom moments per minute, tops." Only zoom clicks that change something the viewer cares about. Everything else plays at full frame. | https://tenzen.studio/blog/smooth-zoom-pan-screen-recording/ |
| "If you're zooming more than once every 3–4 seconds, viewers can't keep up" ("pinball machine"). | https://www.screenify.studio/blog/2026-04-10-auto-zoom-screen-recording |
| Zoom depth: about 1.5x–2x covers almost every desktop UI. Past about 2x, motion lurches and viewers lose orientation. "Frame the element, not the pixel." | https://tenzen.studio/blog/smooth-zoom-pan-screen-recording/ |
| Use 1.5x instead of 2x when motion comfort matters. Ease-in-out over 500 ms or more, never a 200 ms snap. | https://www.screenify.studio/blog/2026-04-10-auto-zoom-screen-recording |
| "Use the lowest scale that makes the detail readable." Subtle styles (fewer, shallower, longer zooms) suit tutorials. Intense styles are tiring. | https://www.tella.com/blog/how-to-add-auto-zoom-to-screen-recordings |
| Anatomy of a zoom: anticipate, ease in, **hold still for the action**, ease out. "Move the camera, or show the action. Never both." Arrive 0.25–0.5 s before the click. Travel takes 0.4–0.8 s. | https://tenzen.studio/blog/smooth-zoom-pan-screen-recording/ |
| Pan between neighbours. Zoom out between strangers. End every scene at full frame. | https://tenzen.studio/blog/smooth-zoom-pan-screen-recording/ |
| Screen Studio "Focused" animation "stabilizes quickly, making it easier to follow and read". "Smooth" is for creative content that isn't about reading. Auto zoom targets the click positions. | https://preview.screen.studio/guide/animations · https://screen.studio/guide/auto-zoom |
| Linear: interface as hero, restrained camera, few motion behaviours repeated ("a reveal, a cut, and one camera move"). Match cuts keep the UI grid anchored. | https://frame24.app/blog/how-linear-makes-launch-videos · https://impractical.ai/launch-videos/linear-linear-releases |

**Kit rules:**
- lint `maxZoomInsPerMin` (default **3**). The allowance is pro-rated by video length, minimum 1, so a 30 s clip gets 2 zoom-ins. A `zone` move counts as a zoom-in.
- `maxZoom` stays at 1.8 and the presets use **1.5–1.6**.
- New lint `stillOnAction`: the camera must not be moving from 6 frames before to 20 frames after any click, hover or key press.
- Moves stay at 30 frames or more (the `gentle` preset uses 40). That is slower than Tenzen's 0.4–0.8 s, on purpose: earlier feedback asked for soft moves, and it fits "Focused".

### 4. Seeing the result of a click

| Finding | Source |
|---|---|
| Hold the zoom after the click so viewers see the result (about 1.2 s by default). Switch to manual framing when the payoff appears away from the cursor. | https://www.screenify.studio/blog/2026-04-10-auto-zoom-screen-recording · https://tenzen.studio/blog/smooth-zoom-pan-screen-recording/ |
| "Hold the outcome twice as long as feels right. The most common failure is cutting away from the result before the viewer has finished reading it." | https://frame24.app/blog/how-linear-makes-launch-videos |
| "Click where you want the viewer to look" and park the cursor while explaining. A wandering pointer creates jittery targets. | https://www.tella.com/blog/how-to-add-auto-zoom-to-screen-recordings |

**Kit rule:** new lint `resultInView`. A state can declare `"result": "<target>"` (the element that changes), and that element must sit inside the settled camera frame 10 frames after the state appears. If the click and its result are far apart, do the click at 100 % (or with a framing that holds both), and only then move in to read.

### 5. Reading time

| Finding | Source |
|---|---|
| Subtitle reading speed: 160–180 wpm, about 0.33 s per word, minimum about 0.3 s per word (BBC). Up to 20 characters per second (Netflix adults). Shown for between 5/6 s and 7 s. | https://auto-caption.app/blog/subtitle-guidelines · https://pepys.co/blog/subtitle-reading-speed-standards |
| Viewers read slower than silent reading speed because they split attention between the text and the picture. | https://pepys.co/blog/subtitle-reading-speed-standards |
| Zoom holds: 0.8–1.2 s for a simple click result, 1.5–2 s for text-heavy UI, never under 0.6 s. | https://www.screenify.studio/blog/2026-04-10-auto-zoom-screen-recording |
| Hotspot or label copy under 60 characters. Completion drops 12 % above that. | https://www.arcade.software/post/2026-arcade-benchmarks |

**Kit rules:**
- **Overlay text** (callouts, texts) stays on screen for at least max(36 f, words ÷ 3 words/s + 0.5 s) and holds at most 60 characters. Lint: `readingWps`, `minTextHold`, `maxLabelChars`.
- **UI reading**: mark the camera key with `"read": <words the viewer is meant to read>`. The camera must then hold still for at least max(`minReadHold` = 60 f, words ÷ 3 words/s). Count the words that matter (diagram labels, the code line), not every word in the panel.

### 6. Cursor

| Finding | Source |
|---|---|
| Screen Studio options: cursor size, smoothing ("Smooth / Medium / Rapid"), "hide cursor if it's not moving", remove shakes, rotate while moving. | https://preview.screen.studio/guide/cursor · https://preview.screen.studio/guide/animations |
| Move the cursor slowly and intentionally, and pause between steps. | https://clickup.com/blog/how-to-create-product-demo-video/ |
| Park the cursor. Don't wander. | https://www.tella.com/blog/how-to-add-auto-zoom-to-screen-recordings |
| Clicks missing their button is "the #1 iteration churn". Derive click targets from layout, not hand-typed coordinates. | https://github.com/noamdorr/saas-product-demo-video (references/click-positioning.md) |
| A soft ring around the pointer that pulses on click makes the click obvious, together with the zoom. | https://www.screenify.studio/blog/2026-04-10-auto-zoom-screen-recording |

**Kit rule:** smoothed eased path, move → stop → click, slight idle drift, violet click frame and ripple on the clicked element. Clicks land on named measured targets (existing lint). The cursor stays visible because this brief requires it, although Screen Studio's default hides it when idle. When the cursor is idle it is parked away from the content being read.

### 7. Cuts versus camera moves, and text overlays

| Finding | Source |
|---|---|
| Linear uses hard cuts and match cuts, but keeps the UI grid anchored across them so the viewer stays oriented. | https://impractical.ai/launch-videos/linear-linear-releases |
| Most viewers watch muted, so type carries the story ("type is the narrator"). Keep one type treatment. | https://frame24.app/blog/how-linear-makes-launch-videos · https://getreely.co/blog/product-hunt-launch-video |
| Two things moving at once (camera and UI) means the viewer tracks neither. | https://tenzen.studio/blog/smooth-zoom-pan-screen-recording/ |

**Kit rule:** keep continuous camera moves within one product view (user preference plus Tenzen). A cut is only acceptable as a match cut that keeps the layout anchored, and the continuity lint still flags cuts between distant zones. Keep text overlays to 0–2 callouts plus the closing URL, one style, 60 characters or fewer.

### Summary → kit defaults

| Lint rule | Default | Source family |
|---|---|---|
| `maxActionsPer10s` | 2 | Arcade, Supademo, Tenzen |
| `maxZoomInsPerMin` | 3 (pro-rated, minimum 1) | Tenzen, Screenify |
| `maxZoom` | 1.8 (presets 1.5–1.6) | Tenzen, Screenify, Tella |
| `stillOnAction` | true (−6…+20 f) | Tenzen |
| `resultInView` | true (states with `result`) | Screenify, Tenzen, frame24 |
| `readingWps` / `minReadHold` | 3 words/s / 60 f | BBC, Netflix, Screenify |
| `minTextHold` / `maxLabelChars` | 36 f / 60 | Netflix, Arcade |
| `maxCallouts` | 2 | Linear (restraint), Arcade |
| `minMove` / `minHold` | 30 f / 30 f | Screenify (≥ 500 ms ease), user feedback |

