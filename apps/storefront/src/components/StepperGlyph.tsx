/**
 * The plus or minus mark inside a quantity stepper button. It is drawn with
 * two CSS bars (`.stepper-glyph` in vendor.css) rather than the "+" and "−"
 * characters, whose position depends on each theme's font metrics and left
 * them sitting too high or too low. The button keeps its own accessible name.
 *
 * Why a new component: the shared icon sets have a plus but no matching
 * minus, and the steppers in the cart, the product page and the Farmhouse cart
 * all need the same two marks.
 */
export function StepperGlyph({ kind }: { kind: 'plus' | 'minus' }) {
  return (
    <span className="stepper-glyph" data-glyph={kind} aria-hidden="true" />
  );
}
