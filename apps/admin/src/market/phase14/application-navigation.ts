import type { MouseEvent } from 'react';
import { go } from '../../vendor/common';

/** Market application links preserve native modified-click behavior. */
export function navigateApplication(event: MouseEvent<HTMLAnchorElement>) {
  if (
    event.button ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const url = new URL(event.currentTarget.href);
  if (
    url.origin !== window.location.origin ||
    !url.pathname.startsWith('/market/')
  )
    return;
  event.preventDefault();
  go(url.pathname + url.search + url.hash);
}
