import { memo, useEffect, useState } from 'react';
import {
  Group,
  Rect,
  Ellipse,
  Line,
  Text,
  Image as KonvaImage,
} from 'react-konva';
import type Konva from 'konva';
import type { MapElement, PublicOccurrenceMap } from '@market/api';
import { defaults } from './model';
export type Space = PublicOccurrenceMap['spaces'][number];
export type BoothStatus = 'available' | 'assigned' | 'paid';
type Event = Konva.KonvaEventObject<MouseEvent | TouchEvent>;
function SafeImage({ element }: { element: MapElement }) {
  const [loaded, setLoaded] = useState<{
    url: string;
    image?: HTMLImageElement;
    failed?: boolean;
  }>();
  useEffect(() => {
    if (!element.imageUrl || !/^https?:\/\/[^\s]+$/.test(element.imageUrl))
      return;
    let alive = true;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (alive) setLoaded({ url: element.imageUrl!, image: img });
    };
    img.onerror = () => {
      if (alive) setLoaded({ url: element.imageUrl!, failed: true });
    };
    img.src = element.imageUrl;
    return () => {
      alive = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [element.imageUrl]);
  const image = loaded?.url === element.imageUrl ? loaded?.image : undefined;
  return image ? (
    <KonvaImage
      image={image}
      width={element.width}
      height={element.height}
      listening={false}
    />
  ) : (
    <>
      <Rect
        width={element.width}
        height={element.height}
        fill="#e8eeea"
        stroke="#9aaea0"
      />
      <Text
        width={element.width}
        height={element.height}
        padding={8}
        text={
          loaded?.url === element.imageUrl && loaded?.failed
            ? 'Image unavailable'
            : element.imageUrl
              ? 'Loading image…'
              : 'Set image URL'
        }
        fontSize={14}
        fill="#315947"
        listening={false}
      />
    </>
  );
}
export const KonvaElement = memo(function KonvaElement({
  element: original,
  space,
  status,
  overlay,
  selected,
  editable,
  panning,
  nodeRef,
  onEnter,
  onLeave,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  element: MapElement;
  space?: Space;
  status?: BoothStatus;
  overlay?: string;
  selected: boolean;
  editable: boolean;
  panning: boolean;
  nodeRef: (id: string, node: Konva.Group | null) => void;
  onEnter: (id: string) => void;
  onLeave: () => void;
  onDragStart: (event: Event) => void;
  onDragMove: (event: Event) => void;
  onDragEnd: (event: Event) => void;
}) {
  const e = defaults(original),
    stroke = { stroke: e.stroke, strokeWidth: e.strokeWidth },
    label = space?.label ?? e.text;
  const path = e.points?.flatMap(
    (p, i) => p * (i % 2 ? e.height : e.width),
  ) ?? [0, 0, e.width, e.height];
  return (
    <Group
      id={e.id}
      name="map-element"
      ref={(node) => nodeRef(e.id, node)}
      x={e.x + e.width / 2}
      y={e.y + e.height / 2}
      offsetX={e.width / 2}
      offsetY={e.height / 2}
      width={e.width}
      height={e.height}
      rotation={e.rotation}
      opacity={e.opacity}
      draggable={editable && !panning && !e.locked}
      listening={editable ? !e.locked && e.opacity !== 0 : e.type === 'SPACE'}
      onMouseEnter={() => onEnter(e.id)}
      onMouseLeave={onLeave}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    >
      {e.type === 'CIRCLE' ? (
        <Ellipse
          x={e.width / 2}
          y={e.height / 2}
          radiusX={e.width / 2}
          radiusY={e.height / 2}
          fill={e.fill}
          {...stroke}
        />
      ) : e.type === 'TRIANGLE' ? (
        <Line
          points={[e.width / 2, 0, e.width, e.height, 0, e.height]}
          closed
          fill={e.fill}
          {...stroke}
        />
      ) : e.type === 'LINE' ? (
        <Line
          points={path}
          stroke={e.stroke}
          strokeWidth={e.strokeWidth}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={12}
        />
      ) : e.type === 'TEXT' ? (
        <>
          <Rect width={e.width} height={e.height} fill="rgba(0,0,0,0)" />
          <Text
            text={e.text}
            width={e.width}
            height={e.height}
            fontSize={e.fontSize}
            fontFamily="Segoe UI, system-ui, sans-serif"
            fontStyle={e.fontWeight}
            align={e.textAlign}
            fill={e.fill}
            listening={false}
          />
        </>
      ) : e.type === 'IMAGE' ? (
        <SafeImage element={e} />
      ) : (
        <Rect
          width={e.width}
          height={e.height}
          fill={
            e.type === 'SPACE' && status
              ? { available: '#f0f5ef', assigned: '#e8edff', paid: '#d8efdf' }[
                  status
                ]
              : e.fill
          }
          cornerRadius={e.type === 'SPACE' ? 3 : 0}
          {...stroke}
        />
      )}
      {e.type === 'SPACE' && (
        <>
          <Text
            x={6}
            y={8}
            width={Math.max(1, e.width - 12)}
            height={18}
            text={label}
            fontSize={12}
            fontStyle="bold"
            fill="#173925"
            listening={false}
          />
          {space?.vendor && (
            <Text
              x={6}
              y={28}
              width={Math.max(1, e.width - 12)}
              height={16}
              text={space.vendor.businessName}
              fontSize={11}
              ellipsis
              fill="#173925"
              listening={false}
            />
          )}
          {overlay && (
            <Text
              x={6}
              y={Math.max(45, e.height - 26)}
              width={Math.max(1, e.width - 12)}
              height={22}
              text={overlay}
              fontSize={10}
              ellipsis
              fill="#173925"
              listening={false}
            />
          )}
        </>
      )}
      {selected && (
        <Rect
          width={e.width}
          height={e.height}
          stroke="#2456b8"
          strokeWidth={2}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
    </Group>
  );
});
