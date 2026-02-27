import React from "react";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";
import { FPS } from "./constants";

import { Scene00_ProblemStatement } from "./scenes/Scene00_ProblemStatement";
import { Scene01_Opening } from "./scenes/Scene01_Opening";
import { Scene02_AuthFlow } from "./scenes/Scene02_AuthFlow";
import { ContinuousChatDemo } from "./scenes/ContinuousChatDemo";
import { Scene10_Closing } from "./scenes/Scene10_Closing";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Scene durations in frames (at 30fps) — matched to audio files
const SCENE_DURATIONS = {
  problemStatement: 8 * FPS,   // 240 — docs chaos + questions
  opening: 5 * FPS,            // 150
  authFlow: 5 * FPS,           // 150 — zoom into email → password → button
  continuousChat: 21 * FPS,    // 630 (includes auth→chat transition)
  closing: 5 * FPS,            // 150
};

// Transition durations in frames
const TRANSITIONS = {
  fade20: 20,
  fade10: 10,
};

export const XBOPresentation: React.FC = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: "relative",
        fontFamily,
        overflow: "hidden",
        background: "#000000",
      }}
    >
      <TransitionSeries>
        {/* Scene 00: Problem Statement (5s) — docs chaos + questions */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.problemStatement}>
          <Scene00_ProblemStatement />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITIONS.fade20 })}
        />

        {/* Scene 01: Opening (6s) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.opening}>
          <Scene01_Opening />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITIONS.fade10 })}
        />

        {/* Scene 02: Auth Flow (5s) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.authFlow}>
          <Scene02_AuthFlow />
        </TransitionSeries.Sequence>

        {/* No transition — ContinuousChatDemo starts with auth→chat transition */}

        {/* Chat Demo (30s) — auth exit + conversation flow */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.continuousChat}>
          <ContinuousChatDemo />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITIONS.fade10 })}
        />

        {/* Closing (6s) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.closing}>
          <Scene10_Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </div>
  );
};
