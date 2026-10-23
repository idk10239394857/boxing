import type { Tier } from '../types';

export const TIERS: Tier[] = [
  { id: 'novice', name: 'Novice', tagline: 'Learn to stand, breathe and throw.' },
  { id: 'fundamentals', name: 'Fundamentals', tagline: 'Clean basics under pressure.' },
  { id: 'contender', name: 'Contender', tagline: 'Combos, defense, ring IQ.' },
  { id: 'sharp', name: 'Sharp', tagline: 'Counters, angles, timing.' },
  { id: 'fight-ready', name: 'Fight Ready', tagline: 'Ready for the bright lights.' },
];

export interface SkillDef {
  id: string;
  tierId: string;
  label: string;
}

const skills = (tierId: string, labels: string[]): SkillDef[] =>
  labels.map((label, i) => ({ id: `${tierId}-${i + 1}`, tierId, label }));

export const SKILLS: SkillDef[] = [
  ...skills('novice', [
    'Hold a balanced stance with hands up for a full round',
    'Throw a straight 1-2 with hip rotation',
    'Step-drag forward, back, left and right without crossing feet',
    'Slip a jab 10x in a row',
    '3 rounds of jump rope without stopping',
    'Wrap your own hands properly',
    'Shadowbox 2 rounds keeping your guard',
  ]),
  ...skills('fundamentals', [
    'Throw all six basic punches with correct form',
    'Land a 1-2-3 on the pads 20x clean',
    'Roll under a hook and return fire',
    'Parry and catch a jab on reaction',
    'Pivot off the lead foot to escape the ropes',
    '6 rounds of bag work at steady pace',
    'Hold the plank 2 minutes',
  ]),
  ...skills('contender', [
    'String 4-punch combos to head and body',
    'Use the jab to control distance for a full round',
    'Counter a jab with a slip-cross',
    'Cut an angle after every combination',
    'Complete 3 rounds of controlled sparring',
    'Double up the jab and lead hook',
    '30 minutes of conditioning without breaking form',
    'Breathe out on every punch for 3 rounds',
  ]),
  ...skills('sharp', [
    'Shoulder-roll and counter the cross',
    'Pull-back counter on reaction in sparring',
    'Feint to draw a reaction, then punish it',
    'Switch levels with body-head combos fluidly',
    'Cut off the ring against a moving partner',
    'Land the liver shot cleanly in sparring',
    '6 rounds of hard sparring with good composure',
  ]),
  ...skills('fight-ready', [
    'Execute a game plan against an unfamiliar sparring partner',
    'Make weight on schedule',
    '12 rounds of pads + bag in one session',
    'Recover heart rate within 60s rest between rounds',
    'Fight effectively off the back foot and the front foot',
    'Stay calm and composed after getting hit clean',
    'Get the green light from your coach',
  ]),
];
