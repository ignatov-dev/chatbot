import { useCurrentFrame } from "remotion";

export function useTypewriter(
  text: string,
  startFrame: number,
  charsPerFrame = 0.5,
) {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(Math.floor(elapsed * charsPerFrame), text.length);
  return text.substring(0, charCount);
}

export function typewriterDuration(text: string, charsPerFrame = 0.5) {
  return Math.ceil(text.length / charsPerFrame);
}
