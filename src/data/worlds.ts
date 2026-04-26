import type { WorldData, WorldNode, WorldPath } from '../types/game.ts';

export const WORLDS: WorldData[] = [
  {
    id: 'w1', index: 0, name: 'Sunseed Plains', subtitle: 'gentle starter region', entry: 'w1_1',
    palette: { top:'#4c86ff', mid:'#85c8ff', bot:'#dbf4ff', hillA:'#4cb24f', hillB:'#2f8b37', ground:0x8a5b35, grass:0x4fb54b, accent:'#ffdd5d', mapGround:'#67d466', ambient:0x98aee4, deco:'meadow' },
    nodes: [
      { id:'w1_1', x:86,  y:246, kind:'normal',    name:'1-1 Meadow Path',   label:'Normal Stage',   diff:1, normalTo:['w1_2'] },
      { id:'w1_2', x:216, y:238, kind:'normal',    name:'1-2 Creek Hop',     label:'Secret Exit',    diff:1, normalTo:['w1_3','w1_bonus'], secretTo:'w1_secret' },
      { id:'w1_bonus', x:196, y:150, kind:'bonus', name:'Coin Grove',        label:'Bonus Node',     diff:1, normalTo:['w1_3'] },
      { id:'w1_secret',x:324,y:136, kind:'secret', name:'Mossy Hollow',      label:'Hidden Route',   diff:1, hidden:true, normalTo:['w1_3'] },
      { id:'w1_3', x:370, y:244, kind:'challenge', name:'1-3 Boulder Run',   label:'Challenge Route',diff:2, normalTo:['w1_fort'] },
      { id:'w1_fort',x:540,y:238, kind:'fortress', name:'Rootkeep Gate',     label:'Fortress',       diff:2, normalTo:['w2_1'], worldUnlock:'w2' },
    ],
    paths: [
      { a:'w1_1', b:'w1_2', mode:'main' }, { a:'w1_2', b:'w1_3', mode:'main' }, { a:'w1_3', b:'w1_fort', mode:'main' },
      { a:'w1_2', b:'w1_bonus', mode:'branch' }, { a:'w1_bonus', b:'w1_3', mode:'branch' },
      { a:'w1_2', b:'w1_secret', mode:'secret' }, { a:'w1_secret', b:'w1_3', mode:'secret' },
    ],
  },
  {
    id: 'w2', index: 1, name: 'Iron Junction', subtitle: 'dense mechanical region', entry: 'w2_1',
    palette: { top:'#4b3f5a', mid:'#8b6e53', bot:'#d7b177', hillA:'#63523f', hillB:'#453426', ground:0x754d2f, grass:0x9a6b3d, accent:'#ffb249', mapGround:'#8d6947', ambient:0x99856a, deco:'factory' },
    nodes: [
      { id:'w2_1', x:88,  y:238, kind:'normal',    name:'2-1 Rust Rail',    label:'Normal Stage',   diff:2, normalTo:['w2_2','w2_gear'] },
      { id:'w2_gear',x:230,y:142, kind:'challenge', name:'Gear Climb',      label:'Hard Route',     diff:3, normalTo:['w2_fort'] },
      { id:'w2_2', x:246, y:240, kind:'vertical',  name:'2-2 Lift Works',  label:'Vertical Stage', diff:3, normalTo:['w2_fort'], secretTo:'w2_coin' },
      { id:'w2_coin',x:380,y:294, kind:'bonus',    name:'Smelter Cache',   label:'Secret Bonus',   diff:2, hidden:true, normalTo:['w2_fort'] },
      { id:'w2_fort',x:536,y:224, kind:'fortress', name:'Boiler Bastion',  label:'Fortress',       diff:4, normalTo:['w3_1'], worldUnlock:'w3' },
    ],
    paths: [
      { a:'w2_1', b:'w2_2', mode:'main' }, { a:'w2_1', b:'w2_gear', mode:'branch' }, { a:'w2_gear', b:'w2_fort', mode:'branch' },
      { a:'w2_2', b:'w2_fort', mode:'main' }, { a:'w2_2', b:'w2_coin', mode:'secret' }, { a:'w2_coin', b:'w2_fort', mode:'secret' },
    ],
  },
  {
    id: 'w3', index: 2, name: 'Cloudreach Peaks', subtitle: 'sky and vertical exploration', entry: 'w3_1',
    palette: { top:'#0670d8', mid:'#7ad5ff', bot:'#eefcff', hillA:'#86d4ff', hillB:'#54b3f4', ground:0x789dd8, grass:0xffffff, accent:'#fff29b', mapGround:'#84d9ff', ambient:0xa7d8ff, deco:'sky' },
    nodes: [
      { id:'w3_1', x:320, y:304, kind:'normal',    name:'3-1 Windway',       label:'Starter Climb',  diff:3, normalTo:['w3_2'] },
      { id:'w3_2', x:286, y:230, kind:'vertical',  name:'3-2 Cloud Stairs',  label:'Secret Exit',    diff:4, normalTo:['w3_3','w3_cloud'], secretTo:'w3_secret' },
      { id:'w3_cloud',x:414,y:236, kind:'bonus',   name:'Nimbus Nest',       label:'Bonus Node',     diff:3, normalTo:['w3_3'] },
      { id:'w3_3', x:258, y:146, kind:'challenge', name:'3-3 Gale Sprint',   label:'Tough Route',    diff:4, normalTo:['w3_fort'] },
      { id:'w3_secret',x:382,y:108, kind:'secret', name:'Sky Lantern Path',  label:'Hidden Shortcut',diff:4, hidden:true, normalTo:['w3_fort'] },
      { id:'w3_fort',x:252,y:62, kind:'fortress',  name:'Stormspire Keep',   label:'Fortress',       diff:5, normalTo:['w4_1'], worldUnlock:'w4' },
    ],
    paths: [
      { a:'w3_1', b:'w3_2', mode:'main' }, { a:'w3_2', b:'w3_3', mode:'main' }, { a:'w3_3', b:'w3_fort', mode:'main' },
      { a:'w3_2', b:'w3_cloud', mode:'branch' }, { a:'w3_cloud', b:'w3_3', mode:'branch' },
      { a:'w3_2', b:'w3_secret', mode:'secret' }, { a:'w3_secret', b:'w3_fort', mode:'secret' },
    ],
  },
  {
    id: 'w4', index: 3, name: 'Crystal Hollows', subtitle: 'secret-heavy mysterious region', entry: 'w4_1',
    palette: { top:'#241447', mid:'#46287a', bot:'#8d61c8', hillA:'#5e3aa2', hillB:'#3b2168', ground:0x5e4678, grass:0x8d7ddb, accent:'#9ffff0', mapGround:'#745bc2', ambient:0x907bc8, deco:'crystal' },
    nodes: [
      { id:'w4_1', x:86,  y:232, kind:'normal',    name:'4-1 Shard Vale',    label:'Normal Stage',   diff:4, normalTo:['w4_2'] },
      { id:'w4_2', x:216, y:232, kind:'challenge', name:'4-2 Echo Tunnels',  label:'Branching Caves',diff:5, normalTo:['w4_3','w4_bonus'] },
      { id:'w4_bonus',x:202,y:310,kind:'bonus',    name:'Gem Cache',         label:'Dead-end Bonus', diff:4, normalTo:['w4_3'] },
      { id:'w4_3', x:380, y:176, kind:'vertical',  name:'4-3 Prism Rise',   label:'Secret Exit',    diff:5, normalTo:['w4_fort'], secretTo:'w4_secret' },
      { id:'w4_secret',x:520,y:92,kind:'secret',   name:'Moon Shard Vault', label:'Hidden Route',   diff:5, hidden:true, normalTo:['w4_fort'] },
      { id:'w4_fort',x:560,y:222, kind:'fortress', name:'Obsidian Seal',    label:'Fortress',       diff:6, normalTo:['w5_1'], worldUnlock:'w5' },
    ],
    paths: [
      { a:'w4_1', b:'w4_2', mode:'main' }, { a:'w4_2', b:'w4_3', mode:'main' }, { a:'w4_3', b:'w4_fort', mode:'main' },
      { a:'w4_2', b:'w4_bonus', mode:'branch' }, { a:'w4_bonus', b:'w4_3', mode:'branch' },
      { a:'w4_3', b:'w4_secret', mode:'secret' }, { a:'w4_secret', b:'w4_fort', mode:'secret' },
    ],
  },
  {
    id: 'w5', index: 4, name: 'Dread Bastion', subtitle: 'dark final region', entry: 'w5_1',
    palette: { top:'#100f1e', mid:'#1e1d33', bot:'#403651', hillA:'#2d283d', hillB:'#1a1827', ground:0x4a404d, grass:0x6b606f, accent:'#ff6d5a', mapGround:'#413846', ambient:0x6e6880, deco:'fortress' },
    nodes: [
      { id:'w5_1', x:92,  y:236, kind:'challenge', name:'5-1 Ash Causeway',       label:'Dangerous Start',diff:6, normalTo:['w5_2'] },
      { id:'w5_2', x:224, y:236, kind:'vertical',  name:'5-2 Ember Lift',         label:'Secret Exit',    diff:6, normalTo:['w5_gauntlet'], secretTo:'w5_treasure' },
      { id:'w5_treasure',x:228,y:332,kind:'bonus', name:'Last Treasury',          label:'Secret Bonus',   diff:5, hidden:true, normalTo:['w5_gauntlet'] },
      { id:'w5_gauntlet',x:394,y:176,kind:'challenge',name:'5-3 Midnight Gauntlet',label:'Hard Route',    diff:7, normalTo:['w5_final'] },
      { id:'w5_final',x:562,y:174,kind:'fortress',  name:'Final Eclipse Keep',    label:'Final Fortress', diff:8, final:true },
    ],
    paths: [
      { a:'w5_1', b:'w5_2', mode:'main' }, { a:'w5_2', b:'w5_gauntlet', mode:'main' }, { a:'w5_gauntlet', b:'w5_final', mode:'main' },
      { a:'w5_2', b:'w5_treasure', mode:'secret' }, { a:'w5_treasure', b:'w5_gauntlet', mode:'secret' },
    ],
  },
];

export const WORLD_INDEX: Record<string, WorldData> = Object.fromEntries(WORLDS.map(w => [w.id, w]));

export const ALL_NODES: WorldNode[] = WORLDS.flatMap(w =>
  w.nodes.map(n => ({
    ...n,
    world:     w.id,
    worldName: w.name,
    palette:   w.palette,
    neighbors: [] as string[],
  }))
);

export const NODE_INDEX: Record<string, WorldNode> = Object.fromEntries(ALL_NODES.map(n => [n.id, n]));

// Build neighbor links
for (const world of WORLDS) {
  for (const path of world.paths as WorldPath[]) {
    NODE_INDEX[path.a]?.neighbors.push(path.b);
    NODE_INDEX[path.b]?.neighbors.push(path.a);
  }
}
