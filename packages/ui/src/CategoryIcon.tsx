import { categoryIconShapes, categoryIconViewBox } from './category-icons';

/** Decorative artwork accompanies the caller's visible category name. No hydration is needed. */
export function CategoryIcon({
  code,
  size = 24,
}: {
  code: string;
  size?: number;
}) {
  const shapes = categoryIconShapes(code);
  if (!shapes) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox={categoryIconViewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shapes.map(({ tag: Shape, attrs }, index) => (
        <Shape key={index} {...attrs} />
      ))}
    </svg>
  );
}
