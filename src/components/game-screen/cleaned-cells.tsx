import { Group, Rect } from "@shopify/react-native-skia";
import { useMemo } from "react";
import type { MazeData } from "@/src/maze/types";

const CLEANED_COLOR = "rgba(0, 255, 0, 0.15)";

type CleanedCellsProps = {
  visitedCells: Set<number>;
  mazeData: MazeData | null;
};

export const CleanedCells: React.FC<CleanedCellsProps> = ({
  visitedCells,
  mazeData,
}) => {
  const rects = useMemo(() => {
    if (!mazeData) return [];
    const { cols, cellSize, offsetX, offsetY } = mazeData;
    const result: { x: number; y: number; size: number }[] = [];
    for (const cellIndex of visitedCells) {
      const col = cellIndex % cols;
      const row = Math.floor(cellIndex / cols);
      result.push({
        x: offsetX + col * cellSize,
        y: offsetY + row * cellSize,
        size: cellSize,
      });
    }
    return result;
  }, [visitedCells, mazeData]);

  return (
    <Group>
      {rects.map((rect, i) => (
        <Rect
          key={i}
          x={rect.x}
          y={rect.y}
          width={rect.size}
          height={rect.size}
          color={CLEANED_COLOR}
        />
      ))}
    </Group>
  );
};
