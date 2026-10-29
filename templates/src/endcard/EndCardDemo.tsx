import { AbsoluteFill } from "remotion";
import { AudioTrack } from "../kit/AudioTrack";
import { BrandEndCard } from "../kit/EndCard";
import { brand, colors } from "../tokens";

export const END_CARD_DURATION = 150;

/** The download end card as a stand-alone composition: big QR, store badge, small socials, all centred in the safe zone. */
export const EndCardDemo: React.FC = () => (
  <AbsoluteFill style={{ background: colors.primaryDeep }}>
    <BrandEndCard
      tagline={brand.tagline}
      qr={{ url: brand.storeUrl, size: 460, label: "Scan to download" }}
      store={{ label: brand.storeLabel }}
      socials={{ kinds: ["instagram", "tiktok"], handle: brand.handle }}
    />
    <AudioTrack
      music="audio/endcard/music-bed.wav"
      duration={END_CARD_DURATION}
      musicGain={0.8}
      fadeOutFrames={40}
      cues={[
        { name: "card in", src: "audio/endcard/sfx-pop.wav", at: 6, frames: 15, volume: 0.4, kind: "sfx" },
        { name: "qr", src: "audio/endcard/sfx-ding.wav", at: 40, frames: 40, volume: 0.35, kind: "sfx" },
      ]}
    />
  </AbsoluteFill>
);
