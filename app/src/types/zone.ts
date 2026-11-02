export const Zone = [
  'CAMP_SITE',
  'FOREST',
  'CAVE',
  'RUINS',
  'VOLCANO',
  'MOUNTAIN',
] as const;

export type ZoneType = (typeof Zone)[number];