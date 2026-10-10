import React from 'react';
import { Composition, staticFile } from 'remotion';
import { UsabilityScene } from './UsabilityScene';
import type { Manifest, Props, Scene } from './types';

// One generic composition per project. Pick the scene with --props '{"sceneId":"<id>"}'.
// Reads <publicDir>/<id>/{scene,manifest}.json (written by screen-kit-capture / screen-kit-render).
export const UsabilityComposition: React.FC<{ id?: string; defaultSceneId: string }> = ({ id = 'UsabilityScene', defaultSceneId }) => (
  <Composition
    id={id}
    component={UsabilityScene}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={300}
    defaultProps={{ sceneId: defaultSceneId } as Props}
    calculateMetadata={async ({ props }) => {
      const [scene, manifest] = await Promise.all([
        fetch(staticFile(`${props.sceneId}/scene.json`)).then((r) => r.json() as Promise<Scene>),
        fetch(staticFile(`${props.sceneId}/manifest.json`)).then((r) => r.json() as Promise<Manifest>),
      ]);
      const c = scene.composition;
      return { fps: c.fps, durationInFrames: c.durationInFrames, width: c.width ?? 1920, height: c.height ?? 1080, props: { ...props, scene, manifest } };
    }}
  />
);
