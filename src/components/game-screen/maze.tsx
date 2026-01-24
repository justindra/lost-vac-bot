import { Path, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { WALL_COLOR, WALL_THICKNESS } from "@/src/maze/constants";
import type { Wall } from "@/src/maze/types";

type MazeProps = {
  walls: Wall[];
};

export const Maze: React.FC<MazeProps> = ({ walls }) => {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    for (const wall of walls) {
      p.moveTo(wall.x1, wall.y1);
      p.lineTo(wall.x2, wall.y2);
    }
    return p;
  }, [walls]);

  return (
    <Path
      path={path}
      color={WALL_COLOR}
      style="stroke"
      strokeWidth={WALL_THICKNESS}
      strokeCap="round"
    />
  );
};
