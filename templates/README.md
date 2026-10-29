# templates

Brand-neutral Remotion compositions plus the audio pipeline. See [`docs/TEMPLATES.md`](../docs/TEMPLATES.md), [`docs/AUDIO.md`](../docs/AUDIO.md), [`docs/WORKFLOW.md`](../docs/WORKFLOW.md).

```bash
npm run audio -- all            # voices, SFX, music, manifests, lip-sync (works offline with a placeholder voice)
npm run studio                  # Remotion Studio
npm run render -- <Id> --out=out/x.mp4 [--frames=0-89] [--still=60]
npm run master -- <Id> out/x-final.mp4         # render + loudness master -> deliver this
npm run add-audio -- in.mp4 out.mp4            # music bed (+ --vo=line.wav@sec) for a silent video such as a screen tour
npm run brand -- <id>           # use brands/<id> (private brands in brands/private-<id>/, git-ignored)
```

Ids: `PromoVertical`, `ReelProblemSolution`, `ReelProblemSolutionNoMusic` (QA only), `SketchCharacters`, `EndCardDemo`.
