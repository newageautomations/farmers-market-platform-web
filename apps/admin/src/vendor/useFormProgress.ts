import { useEffect, useRef, useState, type RefObject } from 'react';

const discardMessage =
  'You have unsaved changes. Leave this page and lose those changes?';

/** Form-level protection also observes hidden values owned by photo and information editors. */
export function useFormProgress(
  form: RefObject<HTMLFormElement | null>,
  protect: boolean,
  gate: boolean,
  validate?: (data: FormData) => void,
) {
  const [valid, setValid] = useState(false);
  const dirty = useRef(false);
  const approved = useRef(false);
  const validator = useRef(validate);
  useEffect(() => {
    validator.current = validate;
  }, [validate]);
  useEffect(() => {
    const element = form.current;
    if (!element || (!protect && !gate)) return;
    let touched = false;
    const snapshot = () =>
      JSON.stringify(
        [...new FormData(element)].map(([key, value]) => [
          key,
          typeof value === 'string'
            ? value
            : [value.name, value.size, value.lastModified],
        ]),
      );
    let baseline = snapshot();
    let currentUrl = window.location.href;
    const inspect = () => {
      if (element.getAttribute('aria-busy') === 'true') return;
      const next = snapshot();
      if (!touched) baseline = next;
      dirty.current = touched && next !== baseline;
      if (dirty.current) approved.current = false;
      if (gate) {
        try {
          const controls = Array.from(element.elements) as HTMLInputElement[];
          if (
            controls.some(
              (control) => control.willValidate && !control.validity.valid,
            )
          )
            throw new Error('invalid');
          validator.current?.(new FormData(element));
          setValid(true);
        } catch {
          setValid(false);
        }
      }
    };
    const interact = () => {
      touched = true;
      queueMicrotask(inspect);
    };
    const observer = new MutationObserver(inspect);
    observer.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    element.addEventListener('input', interact);
    element.addEventListener('change', interact);
    element.addEventListener('click', interact, true);
    inspect();
    const allow = () =>
      !protect ||
      !dirty.current ||
      approved.current ||
      window.confirm(discardMessage);
    const unload = (event: BeforeUnloadEvent) => {
      if (!protect || !dirty.current || approved.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const beforeNavigate = (event: Event) => {
      if (!allow()) event.preventDefault();
      else approved.current = true;
    };
    const click = (event: MouseEvent) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      if (
        !link ||
        link.target === '_blank' ||
        link.hasAttribute('download') ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        link.getAttribute('href')?.startsWith('#')
      )
        return;
      if (!allow()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else approved.current = true;
    };
    const handled = new WeakSet<Event>();
    const back = (event: PopStateEvent) => {
      if (handled.has(event)) return true;
      handled.add(event);
      if (!allow()) {
        event.stopImmediatePropagation();
        window.history.pushState(window.history.state, '', currentUrl);
        return false;
      } else {
        currentUrl = window.location.href;
        approved.current = false;
        return true;
      }
    };
    const beforeRouteChange = (event: Event) => {
      if (!back((event as CustomEvent<PopStateEvent>).detail))
        event.preventDefault();
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('vendor:before-navigate', beforeNavigate);
    window.addEventListener('vendor:before-route-change', beforeRouteChange);
    window.addEventListener('popstate', back, true);
    document.addEventListener('click', click, true);
    return () => {
      observer.disconnect();
      element.removeEventListener('input', interact);
      element.removeEventListener('change', interact);
      element.removeEventListener('click', interact, true);
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('vendor:before-navigate', beforeNavigate);
      window.removeEventListener(
        'vendor:before-route-change',
        beforeRouteChange,
      );
      window.removeEventListener('popstate', back, true);
      document.removeEventListener('click', click, true);
      dirty.current = false;
      approved.current = false;
    };
  }, [form, protect, gate]);
  return {
    valid,
    saved: () => {
      dirty.current = false;
      approved.current = true;
    },
    confirmDiscard: () =>
      !protect || !dirty.current || window.confirm(discardMessage),
  };
}
