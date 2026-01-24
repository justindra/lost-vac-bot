import { PLAYER_RADIUS, WALL_THICKNESS } from "./constants";

/**
 * All functions in this file must be worklet-compatible:
 * - No closures over JS objects
 * - No external function calls (only inline math)
 * - Pure numeric operations only
 */

const EFFECTIVE_RADIUS = PLAYER_RADIUS + WALL_THICKNESS / 2;
const COLLISION_PASSES = 3;

/**
 * Resolve collisions between a circle (player) and all wall segments.
 * Uses iterative position correction with sliding response.
 *
 * @param px - Player X position (intended)
 * @param py - Player Y position (intended)
 * @param wallsFlat - Flat array of wall segments [x1,y1,x2,y2, ...]
 * @param wallCount - Number of walls (wallsFlat.length / 4)
 * @returns [resolvedX, resolvedY] - Position after collision resolution
 */
export function resolveCollisions(
  px: number,
  py: number,
  wallsFlat: number[],
  wallCount: number,
): number[] {
  "worklet";

  let x = px;
  let y = py;
  const r = EFFECTIVE_RADIUS;

  // Multiple passes to handle corners where walls meet
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (let i = 0; i < wallCount * 4; i += 4) {
      const x1 = wallsFlat[i];
      const y1 = wallsFlat[i + 1];
      const x2 = wallsFlat[i + 2];
      const y2 = wallsFlat[i + 3];

      // Find closest point on segment to player center
      const edgeX = x2 - x1;
      const edgeY = y2 - y1;
      const lenSq = edgeX * edgeX + edgeY * edgeY;

      let t = 0;
      if (lenSq > 0) {
        t = ((x - x1) * edgeX + (y - y1) * edgeY) / lenSq;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;
      }

      const closestX = x1 + t * edgeX;
      const closestY = y1 + t * edgeY;

      // Distance from player center to closest point
      const dx = x - closestX;
      const dy = y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < r * r && distSq > 0.0001) {
        // Collision detected — push player out along penetration vector
        const dist = Math.sqrt(distSq);
        const penetration = r - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        x += nx * penetration;
        y += ny * penetration;
      }
    }
  }

  return [x, y];
}
