# creative-motion

Kit público de motion Remotion: primitivas brand-agnostic (`motion-kit`), videos de usabilidad desde UI real (`screen-kit`), plantilla de brand kit y ejemplos ficticios.

Las marcas reales (logos, tokens propietarios, recipes de cliente) viven en **repos privados** que dependen de `packages/motion-kit` y/o `packages/screen-kit`. Este repo tiene **solo herramientas genéricas**.

## Proceso (resumen)

1. **Brief** — objetivo, formato (9:16 / 16:9), duración, voz.
2. **Brand kit** — datos en un repo/carpeta de marca (colores, fuentes, logos, anti-patrones). Usá `brands/_template/` como base.
3. **Recipe / app** — ensambla `motion-kit` + brand kit.
4. **Render** — Remotion Studio / CLI; revisar frames clave.
5. **Feedback** — iterar en la recipe; el kit solo cambia si es reutilizable.
6. **Commit / push** — según el flujo del repo.

Detalle: [`docs/PROCESS.md`](docs/PROCESS.md) · Arquitectura: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Videos de usabilidad: [`docs/USABILITY-VIDEOS.md`](docs/USABILITY-VIDEOS.md)

## Estructura

```
packages/motion-kit/   # primitivas brand-agnostic (SceneWipe, Reveal, Sticker, Check…)
packages/screen-kit/   # videos de usabilidad: captura Playwright + cámara/cursor/clics Remotion + lint narrativo
brands/_template/      # plantilla genérica para nuevas marcas
examples/              # demos públicos sin marca real (demo-wipes, demo-usability)
docs/                  # proceso, arquitectura y reglas de videos de usabilidad
```

## Reglas de diseño

- **Transiciones:** wipes / máscaras geométricas primero; evitar cortes liderados por fade.
- Brand kits = datos. Motion kit = código compartido. Recipes = ensamblan el video.
- No subir logos ni copy de marcas reales a este repo público.

## Arranque rápido

```bash
npm install
npm run studio:demo-wipes

# screen-kit: captura la primera web (archivo W3C) y renderiza ~11 s
npm run capture:demo-usability && npm run render:demo-usability
```

## Remotion

Versión alineada: **4.0.529** en todos los paquetes y ejemplos (React 19.2.3, Playwright 1.64.0 para `screen-kit`).
