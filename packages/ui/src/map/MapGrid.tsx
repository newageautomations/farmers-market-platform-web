import { useMemo } from 'react';
import { Line } from 'react-konva';
import type { Viewport } from './model';
export function MapGrid({
  view,
  width,
  height,
  spacing,
}: {
  view: Viewport;
  width: number;
  height: number;
  spacing: number;
}) {
  const lines = useMemo(() => {
    // Coarsen distant grids and cap line count regardless of world extent.
    const step = spacing * Math.max(1, Math.ceil(18 / (spacing * view.scale))),
      left = -view.x / view.scale,
      top = -view.y / view.scale,
      right = left + width / view.scale,
      bottom = top + height / view.scale,
      result: number[][] = [];
    for (
      let x = Math.floor(left / step) * step;
      x <= right && result.length < 200;
      x += step
    )
      result.push([x, top, x, bottom]);
    for (
      let y = Math.floor(top / step) * step;
      y <= bottom && result.length < 300;
      y += step
    )
      result.push([left, y, right, y]);
    return result;
  }, [view, width, height, spacing]);
  return (
    <>
      {lines.map((points, i) => (
        <Line
          key={i}
          points={points}
          stroke="#dce4df"
          strokeWidth={1 / view.scale}
          listening={false}
        />
      ))}
    </>
  );
}
