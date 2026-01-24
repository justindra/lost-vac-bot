import { colors } from "@/src/styles";

export const PLAYER_RADIUS = 10;
export const CELL_SIZE = PLAYER_RADIUS * 4; // 40px — corridors are 2x player diameter
export const WALL_THICKNESS = 2;
export const WALL_COLOR = colors.main;

// Fog of war
export const FOG_INITIAL_RADIUS = 400;
export const FOG_MIN_RADIUS = PLAYER_RADIUS * 2; // 20px — always see immediate surroundings
export const FOG_SHRINK_RATE = 2; // px per second
