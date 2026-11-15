import { getPublicAssetUrl } from './sound'

const clip = (name: string) => getPublicAssetUrl(`audio/immersion/${name}.ogg`)
export const IMMERSION_CLIPS = {
  'field-hit': clip('field-hit'), 'shield-hit': clip('shield-hit'), 'combined-hit': clip('combined-hit'),
  'field-break': clip('field-break'), 'shield-break': clip('shield-break'), 'combined-break': clip('combined-break'),
  'hull-hit': clip('hull-hit'), repair: clip('repair'),
  'fighter-death': clip('fighter-death'), 'armored-death': clip('armored-death'), 'capital-death': clip('capital-death'),
  deploy: clip('deploy'), synergy: clip('synergy'), 'hq-warning': clip('hq-warning'),
  'crew-tools': clip('crew-tools'), cargo: clip('cargo'), 'radio-fragment': clip('radio-fragment'), 'hull-tick': clip('hull-tick'),
  'pa-clear-lane': clip('pa-clear-lane'), 'pa-maintenance': clip('pa-maintenance'),
  'engine-rocket': clip('engine-rocket'), 'engine-fast': clip('engine-fast'), 'engine-gatling': clip('engine-gatling'),
  'engine-laser': clip('engine-laser'), 'engine-dreadnought': clip('engine-dreadnought'), 'engine-xwing': clip('engine-xwing'),
  'engine-spaceEt': clip('engine-spaceEt'), 'engine-mesiah': clip('engine-mesiah'), 'engine-coreLander': clip('engine-coreLander'),
  'sector-stellar': clip('sector-stellar'), 'sector-asteroid': clip('sector-asteroid'), 'sector-wreck': clip('sector-wreck'),
  'sector-ion': clip('sector-ion'), 'sector-ocean': clip('sector-ocean'), 'sector-volcanic': clip('sector-volcanic'), 'sector-station': clip('sector-station'),
} as const
export type ImmersionClip = keyof typeof IMMERSION_CLIPS
export const SCORE_STEMS: Record<string, string> = Object.fromEntries([
  ['bgm_scifi_loop.ogg', 'cruise'], ['mesiah/amber-ringway.ogg', 'amber'], ['mesiah/silent-fleet.ogg', 'silent'],
  ['mesiah/violet-deepfield.ogg', 'violet'], ['sfx_boss_battle.mp3', 'command'],
  ['bgm_boss_squid.mp3', 'squid'], ['bgm_boss_snake.mp3', 'snake'], ['bgm_boss_final.wav', 'final'],
].map(([source, name]) => [getPublicAssetUrl(`audio/${source}`), clip(`score-${name}`)]))
export const IMMERSION_AUDIO_URLS = [...Object.values(IMMERSION_CLIPS), ...Object.values(SCORE_STEMS)]
