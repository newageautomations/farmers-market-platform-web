import { memo, useEffect, useState } from 'react';
import {
  Group,
  Rect,
  Ellipse,
  Line,
  Text,
  Image as KonvaImage,
  Circle,
} from 'react-konva';
import type Konva from 'konva';
import type { MapElement, PublicOccurrenceMap } from '@market/api';
import { defaults } from './model';
import { assetUrl } from './assets';
import { mapFonts, strokeDash, movePathPoint } from './visuals';
import {
  isMapLegend,
  MAP_LEGEND_TEMPLATE,
  boothStatusColors,
  type MapLegendEntry,
} from './smart-design';
export type Space = PublicOccurrenceMap['spaces'][number];
export type BoothStatus = 'available' | 'assigned' | 'paid';
type Event = Konva.KonvaEventObject<MouseEvent | TouchEvent>;
// Share decoded images across duplicate objects and all map consumers. Bound the cache.
const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(url: string) {
  let pending = images.get(url);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        images.delete(url);
        reject(new Error('Image unavailable'));
      };
      img.src = url;
    });
    if (images.size >= 128) images.delete(images.keys().next().value!);
    images.set(url, pending);
  }
  return pending;
}
function SafeImage({ element }: { element: MapElement }) {
  const url = element.assetId
    ? assetUrl(element.assetId, element.fill)
    : element.imageUrl;
  const [loaded, setLoaded] = useState<{
    url: string;
    image?: HTMLImageElement;
    failed?: boolean;
  }>();
  useEffect(() => {
    if (!url || (!element.assetId && !/^https?:\/\/[^\s]+$/.test(url))) return;
    let alive = true;
    loadImage(url).then(
      (image) => {
        if (alive) setLoaded({ url, image });
      },
      () => {
        if (alive) setLoaded({ url, failed: true });
      },
    );
    return () => {
      alive = false;
    };
  }, [url, element.assetId]);
  const image = loaded?.url === url ? loaded?.image : undefined;
  return image ? (
    <KonvaImage
      image={image}
      width={element.width}
      height={element.height}
      listening={false}
      shadowColor="#263c34"
      shadowBlur={element.shadow === 'soft' ? 5 : 0}
      shadowOpacity={element.shadow === 'soft' ? 0.16 : 0}
      shadowOffsetY={3}
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
          (loaded?.url === url && loaded?.failed) || (element.assetId && !url)
            ? 'Image unavailable'
            : url
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
  onPointChange,
  legendEntries = [],
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
  onPointChange?: (element: MapElement) => void;
  legendEntries?: MapLegendEntry[];
}) {
  const [hovered, setHovered] = useState(false);
  const e = defaults(original),
    shadow = {
      shadowColor: '#263c34',
      shadowBlur: e.shadow === 'soft' ? 5 : 0,
      shadowOpacity: e.shadow === 'soft' ? 0.16 : 0,
      shadowOffsetY: 3,
    },
    stroke = {
      stroke: e.stroke,
      strokeWidth: e.strokeWidth,
      dash: strokeDash(e),
      lineCap: 'round' as const,
      ...shadow,
    },
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
      listening={
        onPointChange
          ? true
          : editable
            ? !e.locked && e.opacity !== 0
            : e.type === 'SPACE'
      }
      onMouseEnter={() => {
        if (editable && !panning) setHovered(true);
        onEnter(e.id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onLeave();
      }}
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
        <>
          {!!e.outlineWidth && (
            <Line
              points={path}
              closed={e.closed}
              tension={e.curved ? 0.35 : 0}
              fill={e.closed ? e.fill : undefined}
              stroke={e.outlineColor ?? '#718171'}
              strokeWidth={(e.strokeWidth ?? 3) + 2 * e.outlineWidth}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          )}
          <Line
            points={path}
            closed={e.closed}
            tension={e.curved ? 0.35 : 0}
            fill={e.closed ? e.fill : undefined}
            {...stroke}
            lineJoin="round"
            hitStrokeWidth={12}
          />
        </>
      ) : isMapLegend(e) ? (
        <>
          <Rect
            width={e.width}
            height={e.height}
            fill={e.labelBackground ?? '#fafaf8'}
            cornerRadius={e.cornerRadius ?? 0}
            {...stroke}
          />
          <Group
            clipX={0}
            clipY={0}
            clipWidth={e.width}
            clipHeight={e.height}
            listening={false}
          >
            <Text
              x={e.labelPadding ?? 16}
              y={e.labelPadding ?? 16}
              width={Math.max(1, e.width - 2 * (e.labelPadding ?? 16))}
              text={e.text.slice(MAP_LEGEND_TEMPLATE.length)}
              fill={e.fill}
              fontSize={e.fontSize}
              fontStyle="bold"
              align={e.textAlign}
              fontFamily={mapFonts[e.fontFamily ?? 'sans'].family}
            />
            {legendEntries.map((entry, index) => {
              const padding = e.labelPadding ?? 16,
                row = (e.fontSize ?? 18) * 1.7,
                y = padding + row * (index + 1.5);
              return (
                <Group key={`${entry.label}:${entry.color}`}>
                  <Rect
                    x={padding}
                    y={y + 2}
                    width={16}
                    height={16}
                    fill={entry.color}
                    stroke={e.fill}
                    strokeWidth={0.75}
                    cornerRadius={3}
                  />
                  <Text
                    x={padding + 26}
                    y={y}
                    width={Math.max(1, e.width - padding * 2 - 26)}
                    text={entry.label}
                    height={row - 4}
                    ellipsis
                    fill={e.fill}
                    fontSize={Math.max(10, (e.fontSize ?? 18) - 2)}
                    fontFamily={mapFonts[e.fontFamily ?? 'sans'].family}
                  />
                </Group>
              );
            })}
            {!legendEntries.length && (
              <Text
                x={e.labelPadding ?? 16}
                y={(e.labelPadding ?? 16) + (e.fontSize ?? 18) * 2}
                text="No mapped items"
                fill={e.fill}
                fontSize={14}
              />
            )}
          </Group>
        </>
      ) : e.type === 'TEXT' ? (
        <>
          <Rect
            width={e.width}
            height={e.height}
            fill={e.labelBackground ?? 'rgba(0,0,0,0)'}
            cornerRadius={e.cornerRadius ?? 0}
            {...(e.labelBackground ? stroke : {})}
          />
          <Text
            text={e.text}
            width={e.width}
            height={e.height}
            fontSize={e.fontSize}
            fontFamily={
              mapFonts[e.fontFamily ?? 'sans']?.family ?? mapFonts.sans.family
            }
            padding={e.labelPadding ?? 0}
            fontStyle={e.fontWeight}
            align={e.textAlign}
            {...(!e.labelBackground ? shadow : {})}
            fill={e.fill}
            listening={false}
          />
        </>
      ) : e.type === 'IMAGE' ? (
        <>
          <Rect width={e.width} height={e.height} fill="rgba(0,0,0,0)" />
          <SafeImage element={e} />
        </>
      ) : (
        <Rect
          width={e.width}
          height={e.height}
          fill={
            e.type === 'SPACE' && status ? boothStatusColors[status] : e.fill
          }
          cornerRadius={e.type === 'SPACE' ? 3 : (e.cornerRadius ?? 0)}
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
      {(selected || (hovered && editable && !panning)) && (
        <Rect
          width={e.width}
          height={e.height}
          stroke="#2456b8"
          strokeWidth={selected ? 2 : 1}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
      {onPointChange &&
        e.points &&
        Array.from({ length: e.points.length / 2 }, (_, index) => (
          <Circle
            key={index}
            x={e.points![index * 2]! * e.width}
            y={e.points![index * 2 + 1]! * e.height}
            radius={5}
            fill="#ffffff"
            stroke="#2456b8"
            strokeWidth={1.5}
            draggable
            onMouseDown={(event) => {
              event.cancelBubble = true;
            }}
            onTouchStart={(event) => {
              event.cancelBubble = true;
            }}
            onDragStart={(event) => {
              event.cancelBubble = true;
            }}
            onDragMove={(event) => {
              event.cancelBubble = true;
            }}
            onDragEnd={(event) => {
              event.cancelBubble = true;
              const next = movePathPoint(e, index, event.target.position());
              event.target.position({
                x: next.points![index * 2]! * e.width,
                y: next.points![index * 2 + 1]! * e.height,
              });
              onPointChange(next);
            }}
          />
        ))}
    </Group>
  );
});
