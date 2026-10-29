import { Composition } from "remotion";
import { VERTICAL_9_16 } from "@eliseo-arevalo/motion-kit";
import { PromoVertical } from "./promo/PromoVertical";
import { promo } from "./promo/timeline";
import { ReelProblemSolution, ReelProblemSolutionNoMusic } from "./reel/ReelProblemSolution";
import { DURATION as REEL_DURATION } from "./reel/timeline";
import { SketchCharacters } from "./sketch/SketchCharacters";
import { DURATION as SKETCH_DURATION } from "./sketch/timeline";
import { EndCardDemo, END_CARD_DURATION } from "./endcard/EndCardDemo";

const common = { width: VERTICAL_9_16.width, height: VERTICAL_9_16.height, fps: VERTICAL_9_16.fps } as const;

/** Every template is a 1080×1920, 30 fps composition; ids are what `npm run render` takes. */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PromoVertical" component={PromoVertical} durationInFrames={promo.duration} {...common} />
    <Composition id="ReelProblemSolution" component={ReelProblemSolution} durationInFrames={REEL_DURATION} {...common} />
    <Composition id="ReelProblemSolutionNoMusic" component={ReelProblemSolutionNoMusic} durationInFrames={REEL_DURATION} {...common} />
    <Composition id="SketchCharacters" component={SketchCharacters} durationInFrames={SKETCH_DURATION} {...common} />
    <Composition id="EndCardDemo" component={EndCardDemo} durationInFrames={END_CARD_DURATION} {...common} />
  </>
);
