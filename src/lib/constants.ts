export const LOCATION_TAGS = [
  "North Cascades",
  "Mountain Loop Highway",
  "Alpine Lakes Wilderness",
  "Olympic",
  "Mount Rainier National Park",
  "South Cascades",
  "Index Area",
] as const;

export type LocationTag = (typeof LOCATION_TAGS)[number];
