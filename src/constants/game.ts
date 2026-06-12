import type { NodeKind, RankType } from '../types/game.ts';

export const SAVE_KEY      = 'star_trail_adventure_v1';
export const TRANSITION_MS = 340;
export const TILE          = 1;

export const NODE_COLORS: Record<NodeKind, string> = {
  normal:    '#5fd35f',
  challenge: '#ff8c38',
  bonus:     '#ffd44f',
  secret:    '#d56dff',
  vertical:  '#7ed7ff',
  fortress:  '#ff4f4f',
};

export const RANK_ORDER: Record<RankType, number> = { C: 0, B: 1, A: 2, S: 3 };

export const WORLD_ORDER = ['w1', 'w2', 'w3', 'w4', 'w5'] as const;

export const IS_TOUCH = matchMedia('(pointer:coarse)').matches || innerWidth < 960;

/** Combo system tuning. */
export const COMBO = {
  windowSec: 3.2,                                 // time to keep a chain alive
  tiers: [[20, 5], [12, 4], [7, 3], [3, 2]] as const, // [minChain, multiplier]
  maxStompDoublings: 5,                           // stomp value caps at base * 2^5
  stompChainFor1Up: 7,                            // stomps in a row to earn a 1UP
} as const;
