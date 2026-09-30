# Proceso — checklist (es-SV)

Checklist completo para producir un video con `creative-motion` + un brand kit (público o privado).

## 1. Brief

- [ ] Objetivo del video (awareness, demo, CTA, etc.)
- [ ] Formato: `VERTICAL_9_16` (1080×1920) o `HORIZONTAL_16_9` (1920×1080), fps 30
- [ ] Duración objetivo (segundos / frames)
- [ ] Marca / producto y nombre oficial a usar en entregables
- [ ] Idioma y voz (ej. español voseo es-SV, formal, etc.)
- [ ] Anti-patrones de copy (ver `brand.json` de la marca)
- [ ] Assets: logos, screenshots, audio (royalty-free)

## 2. Brand kit

- [ ] Existe `brand.json` con colors, fonts, voice, anti
- [ ] `tokens.ts` exporta colores tipados + loaders de fuente
- [ ] Logos en `logo/` (SVG preferido)
- [ ] Si es marca nueva: copiar desde `brands/_template/`
- [ ] Si es marca propietaria: mantenerla en un **repo privado**

## 3. Recipe / app

- [ ] Carpeta de recipe con `package.json` + `src/Root.tsx`
- [ ] Importa `@eliseo-arevalo/motion-kit` (primitivas)
- [ ] Importa tokens / brand del kit correspondiente
- [ ] Timeline propia de la recipe (no hardcodear en el motion-kit)
- [ ] Transiciones con `SceneWipe` (wipeFrames configurable; default 24)
- [ ] Evitar fades como transición principal

## 4. Render

- [ ] `npm run studio` / script de la recipe
- [ ] Revisar wipes en frames de corte
- [ ] Revisar tipografía y contraste con tokens de marca
- [ ] Audio: royalty-free, licencia en `licenses/`, ducking, ~−18 LUFS
- [ ] Sin loops sintéticos cortos como “música”
- [ ] Export a `out/` (ignorado por git; no subir MP4s grandes)

## 5. Feedback

- [ ] Anotar cambios de copy / timing / wipe kind
- [ ] Si el cambio es reutilizable → subir al motion-kit
- [ ] Si es de marca → brand kit
- [ ] Si es de este video → solo la recipe

## 6. Commit / push

- [ ] Mensaje claro (`chore:` / `feat:` / `fix:`)
- [ ] No commitear `node_modules`, `out/`, MP4s, `.env`
- [ ] No incluir assets de marcas reales en el kit público
