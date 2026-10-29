import { SketchBase } from "./SketchBase";
import { KitTendera } from "./KitTendera";
import { TenderaImpl } from "./scenes";

/**
 * "Después lo anoto" with the character-kit tendera (morphing hands, 3/4 turns, Spanish lip-sync).
 * Same scenes, timing and audio as SketchBase; only the tendera's renderer changes.
 */
export const SketchCharacters: React.FC = () => (
  <TenderaImpl.Provider value={KitTendera}>
    <SketchBase />
  </TenderaImpl.Provider>
);
