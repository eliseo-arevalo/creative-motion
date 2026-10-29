// Generic audio-driven timeline. A scene lasts lead + its phrases + tail;
// scenes overlap by `overlap` frames so the incoming wipe covers the outgoing one.

export type PhraseSpec = { key: string; frames: number; gapBefore?: number };

export type SceneSpec<Id extends string = string> = {
  id: Id;
  /** Frames from scene start until the first phrase starts. */
  lead: number;
  phrases: PhraseSpec[];
  /** Frames after the last phrase ends, before the next scene's wipe starts. */
  tail: number;
  /** Optional floor so very short phrases still get room to breathe. */
  minFrames?: number;
};

export type PlacedPhrase = { key: string; at: number; frames: number; end: number };

export type PlacedScene<Id extends string = string> = {
  id: Id;
  from: number;
  /** Mounted length, including the overlap with the next scene. */
  duration: number;
  /** Local frames of each phrase. */
  phrases: PlacedPhrase[];
  /** Local frame where the last phrase ends. */
  voEnd: number;
};

export const buildTimeline = <Id extends string>(
  scenes: SceneSpec<Id>[],
  overlap: number,
) => {
  let cursor = 0;
  const placed: PlacedScene<Id>[] = scenes.map((scene, index) => {
    let t = scene.lead;
    const phrases = scene.phrases.map((p) => {
      t += p.gapBefore ?? 0;
      const placedPhrase = { key: p.key, at: t, frames: p.frames, end: t + p.frames };
      t += p.frames;
      return placedPhrase;
    });
    const body = Math.max(scene.minFrames ?? 0, t + scene.tail);
    const isLast = index === scenes.length - 1;
    const from = cursor;
    cursor += body;
    return {
      id: scene.id,
      from,
      duration: body + (isLast ? 0 : overlap),
      phrases,
      voEnd: t,
    };
  });
  const byId = placed.reduce(
    (acc, s) => {
      acc[s.id] = s;
      return acc;
    },
    {} as Record<Id, PlacedScene<Id>>,
  );
  return {
    scenes: placed,
    byId,
    duration: cursor + 0,
    overlap,
    /** Global frame of a scene-local frame. */
    toGlobal: (id: Id, local: number) => byId[id].from + local,
  };
};
