import { Composition } from 'remotion';
import { Launch } from './Launch';

export const Root = () => (
  <Composition id="FightFlowLaunch" component={Launch} durationInFrames={900} fps={60} width={1920} height={1080} />
);
