import { colors } from "@/src/styles";

export const PLAYER_RADIUS = 10;
export const CELL_SIZE = PLAYER_RADIUS * 4; // 40px — corridors are 2x player diameter
export const WALL_THICKNESS = 2;
export const WALL_COLOR = colors.main;

export const PLAYER_MAX_SPEED = 5; // px per frame at 60fps (~180px/s)

// Fog of war
export const FOG_INITIAL_RADIUS = 400;
export const FOG_MIN_RADIUS = PLAYER_RADIUS * 2; // 20px — always see immediate surroundings

// Battery
export const STARTING_BATTERY = 100; // percent
export const BATTERY_DRAIN_RATE = 1; // percent per second (100s total life)

// Battery power-up
export const BATTERY_POWERUP_VALUE = 20; // percent restored per pickup
export const BATTERY_HIGH_THRESHOLD = 70; // above this %, no batteries spawned
export const BATTERY_LOW_THRESHOLD = 30; // below this %, spawn 2 batteries
export const BATTERY_POWERUP_RADIUS = 8; // pickup detection radius (px)
