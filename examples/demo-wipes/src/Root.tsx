import { Composition } from "remotion";
import { VERTICAL_9_16 } from "@eliseo-arevalo/motion-kit";
import { DemoWipes } from "./DemoWipes";

const DURATION = 120; // 4s — cycles wipe kinds

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DemoWipes"
    component={DemoWipes}
    width={VERTICAL_9_16.width}
    height={VERTICAL_9_16.height}
    fps={VERTICAL_9_16.fps}
    durationInFrames={DURATION}
  />
);
