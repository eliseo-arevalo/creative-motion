# Arquitectura

Tres capas claras:

```
┌─────────────────────────────────────────┐
│  recipes / apps / examples              │
│  Ensambla timeline + escenas + Root     │
│  Consume motion-kit + brand kit         │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴────────┐
        ▼                ▼
┌───────────────┐  ┌─────────────────────┐
│  motion-kit   │  │  brand kit          │
│  código       │  │  datos              │
│  SceneWipe,   │  │  brand.json         │
│  Reveal,      │  │  tokens.ts          │
│  Sticker,     │  │  logo/              │
│  Check,       │  │  voice / anti       │
│  formats      │  └─────────────────────┘
└───────────────┘
```

## motion-kit (`packages/motion-kit`)

Primitivas **brand-agnostic**:

- `SceneWipe` — máscara geométrica; recibe `wipeFrames` (default 24) y no importa timelines de marca
- `Reveal`, `Sticker`, `Check`
- helpers `progress`, `pop`
- `formats.ts` — `VERTICAL_9_16`, `HORIZONTAL_16_9`, fps 30

Los colores de `Check` / UI se pasan por props (default neutro). Sin dependencia hard de tokens de marca.

## Brand kits

Solo datos y assets. En este repo público solo hay `brands/_template/`.  
Kits de marcas reales (logos, copy, tokens propietarios) viven en repos privados que dependen de este kit vía `file:` o registry.

## Examples (`examples/`)

Composiciones Remotion de demostración **sin marca real**. Ejemplo: `demo-wipes`.

## Transiciones

Prioridad: **wipes / clip-path geométricos**. Evitar fades como corte principal. El wipe deja la escena anterior intacta detrás; la entrante es opaca.

## Audio

Ver `packages/motion-kit/src/audio.md`: royalty-free, licencias en `licenses/`, ducking, ~−18 LUFS; sin loops sintéticos cortos.
