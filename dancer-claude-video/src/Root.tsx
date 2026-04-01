import { Composition } from "remotion";
import { Walkthrough } from "./Walkthrough";

export const RemotionRoot = () => {
  return (
    <Composition
      id="DancerClaudeWalkthrough"
      component={Walkthrough}
      durationInFrames={30 * 160}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
