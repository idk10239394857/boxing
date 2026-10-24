import { Composition } from 'remotion';
import { Launch } from './Launch';
import { Vertical } from './Vertical';

export const Root = () => (
  <>
    <Composition id="FightFlowLaunch" component={Launch} durationInFrames={900} fps={60} width={1920} height={1080} />
    <Composition id="FightFlowVertical" component={Vertical} durationInFrames={900} fps={60} width={1080} height={1920} />
  </>
);
