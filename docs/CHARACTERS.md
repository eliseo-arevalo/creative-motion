# Characters

`@eliseo-arevalo/character-kit` is a 2D SVG character rig for Remotion. Full API: [`packages/character-kit/README.md`](../packages/character-kit/README.md) (poses, gait, hands, hair, faces, 3/4 turns, props, lip-sync, tests). This page is the short path.

1. **Define a character** as a spec (body, skin, hair, outfit, face). `templates/src/characters/specs.ts` has two neutral examples; `props.tsx` shows custom props (apron, notebook).
2. **Place and animate** it in a scene (`templates/src/sketch/scenes.tsx`): pose keyframes, gaze, mouth cues from lip-sync, a face that fits the beat (no smiling while the character has the problem: [STYLE-RULES](STYLE-RULES.md)).
3. **Lip-sync**: `npm run audio -- sketch` produces `src/sketch/lipsync.json` (see [RHUBARB.md](RHUBARB.md)).
4. **Check**: `npm test -w @eliseo-arevalo/character-kit` (54 tests, ~3 min) catches limb/hair/pose regressions. Then look at frames: natural arms and hands, no bald patch in 3/4, natural walk.
5. Heavy renders: `--concurrency=2` on small machines, `--frames=a-b` for tests.
