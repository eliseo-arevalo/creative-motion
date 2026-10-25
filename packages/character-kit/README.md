# @eliseo-arevalo/character-kit

Rigged 2D characters for Remotion: flat SVG, hierarchical bones, swappable skins, a pose and gesture
library with springy transitions, mixable facial expressions, auto blink and look-at, and Rhubarb lip-sync.
Brand-agnostic: brand specs and palettes live in the consuming app.

```
src/
  Character.tsx   <Character/>: the whole rig, evaluated per frame
  rig.ts          canvas (800×1500, ground y=1440), joints, 2-bone IK (solveArm), forward kinematics
  poses.ts        POSES (rest, wave, point, think, scratch, celebrate, give, phone, deadpan, akimbo, slump)
  clips.ts        CLIPS: pose + additive motion layer (idle, wave, point, think, scratch, sigh, celebrate, …)
  timeline.ts     key evaluation, anticipation + overshoot spring, per-bone delays (overlap)
  face.ts         expressions (mixable), blink schedule, look-at
  visemes.ts      Rhubarb visemes A–H/X → mouth shapes; parseRhubarb, visemeAt
  presets.ts      ADULT / CHILD proportions, skin tones, basePalette, DEMO_CHARACTER
  parts/          Hand, Mouth, Head (+hair, accessories), Body (torso, top, skirt/pants, apron), Limbs
scripts/lipsync.sh  wav → Rhubarb JSON or a TS module of MouthCue[]
```

Consume it like motion-kit: `"@eliseo-arevalo/character-kit": "file:../../../creative-motion/packages/character-kit"`
(plus a tsconfig `paths` entry to `src/index.ts`). Remotion's bundler resolves react/remotion for it.

> Render tip: Remotion's bundle cache may not notice edits in a `file:` package. Use `--bundle-cache=false`
> when iterating on the kit.

## Conventions

- Angles in degrees. A bone at 0 hangs straight down; positive rotates **outward** (away from the body).
  The left arm/leg is mirrored, so poses are symmetric by default.
- `elbow` and `wrist` are relative to the parent bone. `lean` positive tips the top of the body to screen right.
- `upper` (0–1) shortens the upper arm: use it as foreshortening when the elbow comes toward camera (phone, chin).
- `handDir` sets the hand direction in torso space after IK (0 = down, 180 = up, + outward).
- `reach` places the wrist with IK at an anchor (`chin`, `cheek`, `ear`, `headTop`, `chest`, `pocket`, `hip`,
  `front`) plus `dx/dy` in hand lengths; `bend: 1 | -1` picks the elbow side.

## Create a character

```tsx
import { ADULT, basePalette, type CharacterSpec } from "@eliseo-arevalo/character-kit";

export const VECINA: CharacterSpec = {
  name: "Vecina",
  palette: basePalette("brown"), // light | tan | brown | deep, plus ink/mouth/etc.
  proportions: { ...ADULT, hipHalf: 96 },
  head: { shape: "oval", nose: "button", lashes: true },
  hair: { kind: "curly", color: "#3A2A22", shade: "#55402F" },
  top: { kind: "blouse", color: "#3C6FB6", shade: "#2C5287", sleeve: "short" },
  bottom: { kind: "skirt", color: "#2E3A4A", shade: "#1E2733" },
  apron: { kind: "waist", color: "#E8B84A", shade: "#B8881E", outline: "#1E2A24", pocket: "#F7E4B0" },
  shoes: { color: "#1E2A24" },
  accessories: [{ kind: "earrings", color: "#E8B84A" }],
};

<Character spec={VECINA} shadow />;
```

Every part is a prop: swap `hair.kind` (bun, lowBun, short, curly, bob), `top.kind` (tee, blouse, polo),
`bottom.kind` (skirt, pants, shorts), `apron` (bib, waist or none), `accessories` (glasses, earrings, cap,
pencil, necklace, mustache) and the palette. `CHILD` proportions give a kid from the same parts.

## Animate: track, face, look

```tsx
<Character
  spec={VECINA}
  track={[{ at: 0, clip: "idle" }, { at: 30, clip: "wave" }, { at: 90, clip: "think" }]}
  face={[{ at: 0, mix: "neutral" }, { at: 30, mix: "happy" }, { at: 90, mix: { thinking: 0.7, worried: 0.3 } }]}
  look={[{ at: 0, target: "camera" }, { at: 100, target: { x: 700, y: 600 } }]}
  holdR={() => <rect x={-20} y={-40} width={40} height={74} rx={8} fill="#111" />}
/>
```

Moves into each key use anticipation then a spring with overshoot; torso, shoulders, elbows, head, hands
and wrists start a frame or two apart (overlap), and the apron, bow and hair lag behind the body's velocity
(follow-through). Breathing, weight shift and blinks run on their own; `seed` decorrelates characters.

## Create a pose

A `Pose` is a full skeleton. Start from `REST` and override:

```ts
import { REST, type Pose } from "@eliseo-arevalo/character-kit";

export const SHRUG: Pose = {
  ...REST,
  shrug: 1,
  head: 6,
  armL: { shoulder: 18, elbow: 70, wrist: 20, hand: "open" },
  armR: { shoulder: 18, elbow: 70, wrist: 20, hand: "open" },
};
// Use it inline: track={[{ at: 0, pose: SHRUG }]}
```

Hand shapes: `relaxed` (side-on, for rest), `open` (palm), `flat` (back of the hand, fingers together:
cheek, chest), `point`, `fist`, `hold` (wrapping grip), `pinch` (thumb + index), `count1`, `count2`, `count3`.
Every shape is the same model (palm + four three-point fingers + thumb), so a change of shape between two
keys **morphs** finger by finger instead of popping. `<Hand shape from mix />` draws any blend.

### Holding things

`holdL` / `holdR` draw in hand space, with the origin at the grip slot, while the hand's dominant shape is
`hold` or `pinch`. Centre the object on the origin; the fingers are drawn over it, so they wrap it:

```tsx
const PHONE: HoldRender = ({ worldAngle, shape }) => (
  <g transform={`rotate(${-worldAngle})`}>            {/* keep it upright on screen */}
    <rect x={-22} y={-42} width={44} height={84} rx={8} fill="#222" />
  </g>
);
```

`shape` tells you which grip is showing (`hold` = phone, notebook, box; `pinch` = bill, coin, card).

## Create a gesture (clip)

A clip is a pose plus an additive layer `(t, fps) => PoseDelta`, where `t` is frames since the key:

```ts
import { POSES, type Clip } from "@eliseo-arevalo/character-kit";

export const NOD: Clip = {
  pose: POSES.rest,
  antic: 0.05,
  layer: (t) => ({ head: Math.sin(t / 4) * 6 * Math.max(0, 1 - t / 40) }),
};
// track={[{ at: 20, clip: NOD }]}  (or add it to your own clip table and use names)
```

Layers fade in over 6 frames and out over 8 when the next key starts.

A clip can be a short sequence of poses with `steps` (frames since the key), sharing one layer:

```ts
answerPhone: {
  pose: POSES.phonePocket,                    // hand at the pocket, phone in a grip
  steps: [
    { at: 12, pose: POSES.phoneLook },        // phone up in front of the chest
    { at: 30, pose: POSES.phone },            // at the ear: elbow down and out, head tilted
    { at: 112, pose: POSES.phoneLook },
    { at: 130, pose: POSES.phoneDown },
  ],
  layer: (t) => ({ head: talkNods(t) }),
}
```

## Arms: IK, limits, paths, contacts

Arms with a `reach` (a body / head anchor) are solved with two-bone IK; every arm, solved or not, is then
clamped to `ARM_LIMITS`:

| joint    | range                                                          |
| -------- | -------------------------------------------------------------- |
| shoulder | −80° … 190° (0 = down, + = outward / up)                       |
| elbow    | folds one way only, up to 152°, ≤ 8° hyperextension            |
| wrist    | −95° … 95°                                                     |

- **No stretching**: the wrist target is clamped to `[dMin, upper + fore]` (`dMin` = full elbow fold).
- **Pole**: `pole: [u, v]` (shoulder space, u outward, v down) picks which way the elbow points; the default
  is out and down. The elbow never flips to the other side mid-move.
- **Bend direction** (`bendSign`): taken from each key. When two keys fold opposite ways (e.g. phone in
  front of the chest → at the ear) the elbow swings *toward the camera* over ~8 frames: it slides onto the
  shoulder→wrist line while both bones foreshorten (`upper`, `fore`), instead of popping to the mirror pose.
- **Paths**: hands travel on arcs (quadratic Bézier), not straight lines. Paths bow away from the shoulder
  (no fully-folded pass), around the outside of the head (chin → top of the head), and come up to the face
  from below / outside. Overshoot runs along the end tangent, never into the face.
- **Contacts** (`cheek`, `chin`, `ear`, `headTop`, …): the hand may only enter the head oval near the
  anchor it is landing on or leaving; the palm turns to the face before landing and leaves before turning.
- **Layering**: in a 3/4 turn the far arm crossfades between behind and in front of the torso / face
  (`armFrontAt`, averaged over past frames), so it never flickers.

### Test

`npm test` runs `test/rig.test.mjs`: every ordered pair of clips (adult and child) plus each clip from idle
in full, frame by frame, checking joint ranges, inverted elbows, stretching, hand / forearm / elbow inside
the head (except at the contact), wrist pops, elbow flips and layer flicker. It must report 0 violations.

## 3/4 turns

```tsx
<Character spec={TENDERA} turn={[{ at: 0, yaw: 0 }, { at: 20, yaw: 1 }, { at: 60, yaw: -0.5 }]} />
```

`yaw` −1 … 1 (±1 = three-quarter view to screen left / right). The head leads with a spring; the body follows
3 frames later at 75% (the far shoulder narrows and its arm goes behind the torso, a side plane appears,
apron and necklace slide toward the turn). Features compress on the far side, the near ear stays, the far
ear tucks away.

## Gestures

Clips: `idle`, `wave`, `point`, `think`, `phone`, `give`, `celebrate`, `scratch`, `deadpan`, `sigh`,
`akimbo`, plus `count` (counts 1-2-3 on the fingers), `pointPhone` (phone in the left hand, right index
taps it), `cheek` (flat hand on the cheek, wrist tap), `shrug` and `answerPhone` (pocket → look → ear →
talk → lower; hold a `PHONE` in `holdR`).

## Lip-sync

Rhubarb (1.14, `~/.local/bin/rhubarb` on the box) turns a wav into mouth cues. The script uses the
language-independent phonetic recognizer, so Spanish works:

```bash
bash packages/character-kit/scripts/lipsync.sh vo.wav src/characters/lipsync/vo.ts vo   # TS module
bash packages/character-kit/scripts/lipsync.sh vo.wav vo.json                            # raw JSON
TEXT=vo.txt bash packages/character-kit/scripts/lipsync.sh vo.wav vo.json                # with transcript
```

Then align the cues with the audio frame:

```tsx
import { vo } from "./lipsync/vo";

<Sequence from={40}><Audio src={staticFile("vo.wav")} /></Sequence>
<Character spec={VECINA} speech={[{ from: 40, cues: vo }]} />
```

Visemes A–H and X map to mouth shapes (open, wide, round, teeth, tongue, bite, pressed) with a short
crossfade. While talking, the mouth comes from the viseme and the rest of the face from the expression.
For JSON, `parseRhubarb(json)` gives the same `MouthCue[]`.

### Spanish from ElevenLabs timestamps (preferred)

If the VO comes from ElevenLabs `/with-timestamps`, keep its `alignment` (characters + start/end seconds)
and map letters to visemes directly; it is exact and costs nothing extra:

```ts
import { cuesFromAlignment } from "@eliseo-arevalo/character-kit";
import alignment from "./vo.alignment.json";

const cues = cuesFromAlignment(alignment, { offset: 0 }); // MouthCue[]
```

Spanish rules: a→D, e→C, i/y→B, o→E, u→F, m/b/p/v→A (closed), f→G, l/n/ñ/d/t→H, other consonants take
the neighbouring vowel's shape; `h` and the `u` of que/qui/gue/gui are silent; commas, periods and pauses
≥ 0.12 s close the mouth (X). Use Rhubarb when there is no alignment (recorded voice).

## Limitations

No full profile (3/4 is the most), the body turn is a 2D cheat (good to ±1, not beyond), IK is 2D
(depth is faked with foreshortening: the `upper` / `fore` factors and the elbow-toward-camera swing), hands are cartoon four-finger hands with no per-finger
posing beyond the shape library, and Rhubarb is approximate for Spanish (use alignment when possible).
