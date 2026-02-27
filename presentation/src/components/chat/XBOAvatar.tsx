import React from "react";
import { Img, staticFile } from "remotion";

interface XBOAvatarProps {
  size?: number;
}

export const XBOAvatar: React.FC<XBOAvatarProps> = ({ size = 32 }) => (
  <Img
    src={staticFile("XBO.svg")}
    style={{ width: size, height: size }}
  />
);
