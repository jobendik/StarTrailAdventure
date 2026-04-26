export const PHYS = {
  walk:        6.2,
  run:         10.6,
  jump:        14.8,
  highJump:    16.3,
  stomp:       11.8,
  acc:         22,
  airAcc:      14,
  dec:         18,
  coyote:      0.13,
  jumpBuf:     0.16,
  apexZone:    2.7,
  apexGrav:    0.48,
  fallMul:     1.38,
  lowJumpMul:  2.18,
} as const;

export const GRAV = -44;

export const FX = {
  freeze: { stomp: 0.05, brick: 0.04, power: 0.07, dmg: 0.1,  bounce: 0.04 },
  shake:  { stomp: 0.16, brick: 0.18, dmg:  0.24, bounce: 0.1  },
} as const;
