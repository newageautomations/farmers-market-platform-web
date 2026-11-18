import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { safeStorefrontUrl, type StorefrontWebsiteRecord } from '@market/api';
import { Skeleton } from '@market/ui';
import { browserOrigin, browserUrl } from './remote-demo';

type PreviewGrant = { token: string; expiresAt: number; url: string };

/** Desktop width the homepage renders at before it is scaled into the card. */
const frameWidth = 1280;
const frameHeight = 800;

/**
 * Website Library card thumbnail. The storefront editor's `PreviewFrame` is
 * an interactive, editor-owned controller (section selection, navigation,
 * reconnect status), so it is not reused here. This reuses its
 * `storefront-editor-v1` handshake and preview grant to render the saved
 * draft's homepage, non-interactive and scaled down. A generic shared
 * `Skeleton` layout (the same for every theme) covers it and remains when the preview is
 * unavailable (no grant, storefront offline or an expired grant). A slow
 * render keeps the mockup until the homepage arrives.
 */
export function WebsiteThumbnail({
  record,
  storefrontId,
  preview,
}: {
  record: StorefrontWebsiteRecord;
  storefrontId: string;
  /** A stable reference (the library API's method), called once per card. */
  preview?: (storefrontId: string, websiteId: string) => Promise<PreviewGrant>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [grant, setGrant] = useState<PreviewGrant>();
  const [rendered, setRendered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scale, setScale] = useState(0);

  // Only request a preview once the card is on screen.
  useEffect(() => {
    const node = box.current;
    if (!node || !preview || typeof IntersectionObserver === 'undefined')
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [preview]);

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    setScale(node.clientWidth / frameWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() =>
      setScale(node.clientWidth / frameWidth),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !preview) return;
    let active = true;
    void preview(storefrontId, record.id)
      .then((value) => {
        const url = safeStorefrontUrl(value.url);
        if (
          !url ||
          !/^[A-Za-z0-9_-]{43}$/.test(value.token) ||
          value.expiresAt <= Date.now()
        )
          throw new Error('Preview unavailable');
        if (active) setGrant({ ...value, url });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [visible, preview, storefrontId, record.id]);

  useEffect(() => {
    if (!grant || rendered) return;
    const origin = browserOrigin(grant.url);
    const section =
      record.draft.template?.id === 'editorial-market'
        ? 'editorial:hero'
        : 'hero';
    function message(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.origin !== origin ||
        event.data?.protocol !== 'storefront-editor-v1'
      )
        return;
      if (event.data.type === 'ready')
        // Each `ready` (first load and after the draft render) gets the draft.
        frame.current?.contentWindow?.postMessage(
          {
            protocol: 'storefront-editor-v1',
            type: 'update',
            ...grant,
            config: record.draft,
            path: '/',
            section,
            mode: 'browse',
            scroll: false,
          },
          origin,
        );
      else if (event.data.type === 'rendered') setRendered(true);
      else if (event.data.type === 'expired') setFailed(true);
    }
    window.addEventListener('message', message);
    return () => {
      window.removeEventListener('message', message);
    };
  }, [grant, rendered, record.draft]);

  const live = grant && !failed;
  return (
    <div
      ref={box}
      className="website-thumbnail"
      data-state={
        live && rendered ? 'rendered' : failed ? 'unavailable' : 'loading'
      }
      role="img"
      aria-label={`${record.name} homepage preview`}
      style={{ '--thumb-scale': scale || undefined } as CSSProperties}
    >
      <div className="website-thumbnail-skeleton" aria-hidden="true">
        <Skeleton className="website-thumbnail-skeleton-bar" />
        <Skeleton className="website-thumbnail-skeleton-hero" />
        <div className="website-thumbnail-skeleton-row">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
      {live && scale > 0 && (
        <iframe
          ref={frame}
          key={grant.url}
          src={browserUrl(`${grant.url}/storefront-editor-preview/`)}
          title={`${record.name} homepage preview`}
          width={frameWidth}
          height={frameHeight}
          tabIndex={-1}
          aria-hidden="true"
          inert
          scrolling="no"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
