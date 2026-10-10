# Arquitectura

Capas:

```
┌─────────────────────────────────────────┐
│  recipes / apps / examples              │
│  Ensambla timeline + escenas + Root     │
│  Consume motion-kit / screen-kit + brand│
└───────────────┬─────────────────────────┘
                │
     ┌──────────┼──────────────┐
     ▼          ▼              ▼
┌───────────┐ ┌──────────────┐ ┌─────────────┐
│ motion-kit│ │ screen-kit   │ │ brand kit   │
│ código    │ │ código + CLI │ │ datos       │
│ SceneWipe,│ │ capture,     │ │ brand.json  │
│ Reveal,   │ │ Camera,      │ │ tokens.ts   │
│ Sticker,  │ │ Cursor,      │ │ logo/       │
│ Check,    │ │ ClickFrame,  │ │ voice/anti  │
│ formats   │ │ lint, render │ └─────────────┘
└───────────┘ └──────────────┘
```

Tres capas (o cuatro, contando screen-kit): **este repo solo tiene herramientas genéricas**. Los proyectos concretos (videos de un producto, marcas) viven en repos aparte que dependen de los paquetes (`file:` hoy, GitHub/registry después).

## motion-kit (`packages/motion-kit`)

Primitivas **brand-agnostic**:

- `SceneWipe` — máscara geométrica; recibe `wipeFrames` (default 24) y no importa timelines de marca
- `Reveal`, `Sticker`, `Check`
- helpers `progress`, `pop`
- `formats.ts` — `VERTICAL_9_16`, `HORIZONTAL_16_9`, fps 30

Los colores de `Check` / UI se pasan por props (default neutro). Sin dependencia hard de tokens de marca.

## screen-kit (`packages/screen-kit`)

Videos de usabilidad y demos de producto a partir de **UI real**:

- `capture/capture.mjs` (bin `screen-kit-capture`): Playwright abre la app, fija estado (localStorage, tema, idioma), ejecuta acciones por estado y guarda screenshots hi-DPI + bounding boxes de targets + fuentes en `<captures>/<id>/`
- `src/` (Remotion): `UsabilityComposition` / `UsabilityScene`, `Camera` (ease, spring, zone, cut, wipe), `Cursor`, `ClickFrame`, `Ripple`, `Callout`, `Keycap`, `StateStack`, `geometry`, presets de ritmo, `DEFAULT_THEME` (el acento es parámetro de tema)
- `scripts/lint.mjs` (bin `screen-kit-lint`): reglas de narrativa (continuidad, ≤ 2 callouts, cursor visible, énfasis = clic, ≤ 2 acciones cada 10 s, presupuesto de zoom, cámara quieta en cada acción, resultado en cuadro, pausas de lectura)
- `scripts/render.mjs` (bin `screen-kit-render`): copia la escena, corre el lint y renderiza con el Remotion CLI del proyecto

Una escena = un JSON con `capture` + `composition`. Reglas e investigación: `docs/USABILITY-VIDEOS.md`. Ejemplo: `examples/demo-usability`.

## Brand kits

Solo datos y assets. En este repo público solo hay `brands/_template/`.  
Kits de marcas reales (logos, copy, tokens propietarios) viven en repos privados que dependen de este kit vía `file:` o registry.

## Examples (`examples/`)

Composiciones Remotion de demostración **sin marca real**: `demo-wipes` (motion-kit) y `demo-usability` (screen-kit sobre el archivo W3C de la primera web).

## Transiciones

Prioridad: **wipes / clip-path geométricos**. Evitar fades como corte principal. El wipe deja la escena anterior intacta detrás; la entrante es opaca.

## Audio

Ver `packages/motion-kit/src/audio.md`: royalty-free, licencias en `licenses/`, ducking, ~−18 LUFS; sin loops sintéticos cortos.
