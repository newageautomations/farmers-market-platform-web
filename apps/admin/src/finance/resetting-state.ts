import { useState } from 'react';

/**
 * State that returns to `initial` whenever any dependency changes, without a
 * reset effect (for example, paging that restarts when filters change).
 */
export function useResettingState<T>(initial: T, deps: readonly unknown[]) {
  const [state, setState] = useState({ deps, value: initial });
  const current =
    state.deps.length === deps.length &&
    state.deps.every((dep, index) => Object.is(dep, deps[index]))
      ? state.value
      : initial;
  const set = (next: T | ((value: T) => T)) =>
    setState({
      deps,
      value:
        typeof next === 'function' ? (next as (value: T) => T)(current) : next,
    });
  return [current, set] as const;
}
