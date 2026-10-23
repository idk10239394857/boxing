import type { TechniqueCategory } from '../types';

export interface TechniqueDef {
  id: string;
  name: string;
  category: TechniqueCategory;
  description: string;
  cues: string[];
}

export const CATEGORIES: TechniqueCategory[] = ['Punches', 'Defense', 'Footwork', 'Combos'];

export const TECHNIQUES: TechniqueDef[] = [
  // Punches
  {
    id: 'jab',
    name: 'Jab',
    category: 'Punches',
    description: 'Fast, straight lead-hand punch. Your range finder, setup tool and best defense.',
    cues: ['Snap it out and back faster than it went out.', 'Turn the fist over at the end; chin tucked behind the shoulder.'],
  },
  {
    id: 'cross',
    name: 'Cross',
    category: 'Punches',
    description: 'Straight rear-hand power shot driven by hip and rear-foot rotation.',
    cues: ['Pivot the rear heel out, like squashing a bug.', 'Rotate hips through; return hand straight to the chin.'],
  },
  {
    id: 'lead-hook',
    name: 'Lead Hook',
    category: 'Punches',
    description: 'Short, horizontal lead-hand punch that comes around the guard.',
    cues: ['Elbow at shoulder height, arm locked at ~90°.', 'Power from the lead foot pivot, not the arm.'],
  },
  {
    id: 'rear-hook',
    name: 'Rear Hook',
    category: 'Punches',
    description: 'Looping rear-hand hook, best thrown after a lead shot moves the guard.',
    cues: ['Keep it tight — no wind-up.', 'Lead hand stays home guarding the chin.'],
  },
  {
    id: 'lead-uppercut',
    name: 'Lead Uppercut',
    category: 'Punches',
    description: 'Rising lead-hand punch that splits the guard at close range.',
    cues: ['Dip slightly onto the lead leg, then drive up.', 'Palm faces you; keep it short.'],
  },
  {
    id: 'rear-uppercut',
    name: 'Rear Uppercut',
    category: 'Punches',
    description: 'Rear-hand uppercut that punishes opponents who lean in or duck.',
    cues: ['Drop the rear shoulder a touch, then rotate up through the hip.', "Don't drop the hand before throwing."],
  },
  {
    id: 'overhand-right',
    name: 'Overhand Right',
    category: 'Punches',
    description: 'Arcing rear-hand punch thrown over the opponent’s jab.',
    cues: ['Slip outside the jab as you throw.', 'Head off the centre line, arc over the top.'],
  },
  {
    id: 'body-jab',
    name: 'Body Jab',
    category: 'Punches',
    description: 'Jab to the solar plexus thrown by bending the knees, not the waist.',
    cues: ['Level change with the legs; head stays upright.', 'Rear hand glued to the chin.'],
  },
  {
    id: 'liver-shot',
    name: 'Liver Shot',
    category: 'Punches',
    description: 'Lead hook to the right side of the body, just under the ribs.',
    cues: ['Dip to the lead side, elbow tucked to the hip.', 'Aim through the target, slightly upward.'],
  },
  // Defense
  {
    id: 'slip',
    name: 'Slip',
    category: 'Defense',
    description: 'Small head movement off the centre line to make a straight punch miss.',
    cues: ['Rotate the shoulders, don’t lean — move inches, not feet.', 'Eyes stay on the opponent; be ready to counter.'],
  },
  {
    id: 'roll',
    name: 'Roll',
    category: 'Defense',
    description: 'U-shaped duck under a hook, rising on the other side ready to fire.',
    cues: ['Bend the knees, not the back.', 'Roll toward the punch, come up in your stance.'],
  },
  {
    id: 'pull-back',
    name: 'Pull-Back',
    category: 'Defense',
    description: 'Shift weight to the rear foot to take the head just out of range.',
    cues: ['Lean back over the rear foot, chin down.', 'Pull back and fire the counter cross immediately.'],
  },
  {
    id: 'high-block',
    name: 'High Block',
    category: 'Defense',
    description: 'Gloves to the temples, elbows tight, absorbing hooks and overhands.',
    cues: ['Glove touches the head — don’t reach out.', 'Exhale and brace on impact.'],
  },
  {
    id: 'parry',
    name: 'Parry',
    category: 'Defense',
    description: 'Small redirect of a straight punch with the open glove.',
    cues: ['Tap, don’t swat — short and late.', 'Parry inward, then counter straight down the pipe.'],
  },
  {
    id: 'catch',
    name: 'Catch',
    category: 'Defense',
    description: 'Catch the jab in the rear palm like catching a ball.',
    cues: ['Meet it close to your face; don’t extend.', 'Catch and return a jab in rhythm.'],
  },
  {
    id: 'shoulder-roll',
    name: 'Shoulder Roll',
    category: 'Defense',
    description: 'Philly-shell defense: lead shoulder deflects the cross, rear hand catches.',
    cues: ['Turn the lead shoulder up to the chin.', 'Roll off, then come back with the rear hand.'],
  },
  // Footwork
  {
    id: 'step-drag',
    name: 'Step-Drag',
    category: 'Footwork',
    description: 'Basic movement: the foot nearest the direction moves first, the other follows.',
    cues: ['Never cross the feet.', 'Keep stance width the same after every step.'],
  },
  {
    id: 'pivots',
    name: 'Pivots',
    category: 'Footwork',
    description: 'Rotate on the lead foot to change angle and escape the line of fire.',
    cues: ['Weight on the ball of the lead foot.', 'Swing the rear leg ~45–90° in one sharp motion.'],
  },
  {
    id: 'lateral-movement',
    name: 'Lateral Movement',
    category: 'Footwork',
    description: 'Moving side to side to stay off the centre line and off the ropes.',
    cues: ['Small steps, stay on the balls of your feet.', 'Move off the opponent’s power hand.'],
  },
  {
    id: 'cutting-angles',
    name: 'Cutting Angles',
    category: 'Footwork',
    description: 'Step off-line after punching to land a fresh angle the opponent can’t see.',
    cues: ['Punch, then step outside the lead foot.', 'Your lead foot outside theirs = open shots.'],
  },
  {
    id: 'in-and-out',
    name: 'In-and-Out',
    category: 'Footwork',
    description: 'Burst into range, land, and leave before they can return fire.',
    cues: ['Explode off the rear foot, push back off the lead.', 'Hands stay up on the way out.'],
  },
  // Combos
  {
    id: 'one-two',
    name: '1-2',
    category: 'Combos',
    description: 'Jab-cross: the bread and butter of boxing.',
    cues: ['Jab blinds, cross lands — no pause between.', 'Hips rotate fully on the 2.'],
  },
  {
    id: 'jab-cross-hook',
    name: 'Jab-Cross-Hook',
    category: 'Combos',
    description: 'The 1-2-3: the cross loads the lead hook automatically.',
    cues: ['Cross rotation turns you into the hook.', 'Keep the hook tight and short.'],
  },
  {
    id: 'hook-cross-hook',
    name: 'Hook-Cross-Hook',
    category: 'Combos',
    description: 'Inside-fighting chain rotating hips back and forth.',
    cues: ['Stay low and in the pocket.', 'Each punch loads the next — rhythm over power.'],
  },
  {
    id: 'body-head',
    name: 'Body-Head Combos',
    category: 'Combos',
    description: 'Go downstairs to drop the guard, then come back up top.',
    cues: ['Change levels with the legs.', 'Body shot first, head shot when the hands drop.'],
  },
];
