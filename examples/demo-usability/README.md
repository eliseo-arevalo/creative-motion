# demo-usability

Ejemplo mínimo y genérico de [`@eliseo-arevalo/screen-kit`](../../packages/screen-kit). Captura la **primera web** en el archivo del W3C (`https://www.w3.org/History/19921103-hypertext/hypertext/WWW/TheProject.html`), una página congelada desde 1992 y por eso estable. Renderiza 11,5 s:

1. Arranca al 100 %.
2. Zoom suave (1,5x) al texto, con pausa de lectura.
3. El cursor va a "What's out there?" y hace clic (marco de acento y ripple). La página real de destino ("General Overview") aparece en el mismo cuadro.
4. Vuelve a 100 % y cierra con la URL.

El lint queda limpio.

La escena inyecta un CSS de lectura (`capture.css`: ancho de columna y tipografía) porque la página original de 1992 no tiene estilos y a 1920 px el texto ocupa toda la pantalla. En una app real no "maquilles" la UI.

```bash
# desde la raíz del repo
npm install
npx playwright install chromium        # si no tenés Google Chrome
npm run capture:demo-usability         # → examples/demo-usability/captures/demo/
npm run render:demo-usability          # lint + MP4 → examples/demo-usability/out/demo-1920x1080.mp4
npm run studio:demo-usability          # preview
```

`captures/` y `out/` no se versionan. `example.com` ya no sirve como demo: desde 2025 no tiene título ni link y pide no usarlo para pruebas. Reglas de narrativa: [`docs/USABILITY-VIDEOS.md`](../../docs/USABILITY-VIDEOS.md).
