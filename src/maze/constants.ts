import { colors } from "@/src/styles";

export const PLAYER_RADIUS = 10;
export const CELL_SIZE = PLAYER_RADIUS * 4; // 40px — corridors are 2x player diameter
export const WALL_THICKNESS = 2;
export const WALL_COLOR = colors.main;

// Fog of war
export const FOG_INITIAL_RADIUS = 400;
export const FOG_MIN_RADIUS = PLAYER_RADIUS * 2; // 20px — always see immediate surroundings

// Battery
export const STARTING_BATTERY = 100; // percent
export const BATTERY_DRAIN_RATE = 1; // percent per second (100s total life)

// Battery power-up
export const BATTERY_POWERUP_VALUE = 20; // percent restored per pickup
export const BATTERY_POWERUP_MIN_LEVEL = 3; // first level batteries appear
export const BATTERY_LOW_THRESHOLD = 15; // below this %, spawn 2 batteries
export const BATTERY_POWERUP_RADIUS = 8; // pickup detection radius (px)
