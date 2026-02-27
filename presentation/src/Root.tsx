import React from "react";
import { Composition } from "remotion";
import { XBOPresentation } from "./Video";
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="XBOPresentation"
      component={XBOPresentation}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
