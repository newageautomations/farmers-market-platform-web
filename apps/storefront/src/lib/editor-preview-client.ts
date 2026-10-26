import {
  storefrontAppearanceSchema,
  storefrontTextSizeCss,
  aboutSections,
  defaultAboutCta,
  storefrontPreviewPath,
  storefrontText,
  storefrontTextFields,
  isStorefrontEditorSection,
  storefrontEditorSectionLabel,
  storefrontThemeVariables,
  vendorHeroIntroduction,
  type StorefrontAppearance,
  type StorefrontEditorSection,
  type StorefrontTextKey,
} from '@market/theme/storefront';

// Astro may hoist an imported component script even when its conditional markup is absent.
if (document.getElementById('storefront-editor-state')) startEditorPreview();

function startEditorPreview() {
  const embedded = JSON.parse(
    document.getElementById('storefront-editor-state')!.textContent!,
  );
  const parentOrigin: string = embedded.parent;
  let config: StorefrontAppearance | undefined = embedded.state?.config;
  const path: string | undefined = embedded.state?.path;
  let expiry = 0;
  let selected: StorefrontEditorSection = 'hero';
  let timer: ReturnType<typeof setTimeout>;
  const send = (value: object) =>
    window.parent.postMessage(
      { protocol: 'storefront-editor-v1', ...value },
      parentOrigin,
    );

  function structural(value: StorefrontAppearance) {
    if (value.template) return JSON.stringify(value);
    return JSON.stringify({
      theme: value.theme,
      findUs: value.findUs,
      contact: value.contact,
      faq: value.faq,
      policies: value.policies,
      image: value.homepage.image,
      story: value.homepage.story,
      vendor: value.vendor
        ? {
            relatedEnabled: value.vendor.relatedEnabled,
            featuredIds: value.vendor.featuredIds,
            aboutEnabled: value.vendor.aboutEnabled,
            aboutImage: value.vendor.aboutImage,
            aboutUseLegacyStory: value.vendor.aboutUseLegacyStory,
          }
        : null,
      about: {
        enabled: value.about.enabled,
        sections: aboutSections(value.about).map((s) => ({
          id: s.id,
          layout: s.layout,
          image: s.image,
          imageAssetId: s.imageAssetId,
          visible: s.visible,
          hasText: !!(s.heading || s.body),
        })),
      },
    });
  }
  function select(section: StorefrontEditorSection, scroll = false) {
    selected = section;
    document.querySelectorAll('[data-editor-selected]').forEach((node) => {
      node.removeAttribute('data-editor-selected');
      node.removeAttribute('data-editor-position-static');
    });
    document
      .querySelectorAll('.storefront-editor-selection-label')
      .forEach((label) => label.remove());
    const element = document.querySelector<HTMLElement>(
      `[data-editor-section="${section}"]`,
    );
    if (element) {
      element.dataset.editorSelected = storefrontEditorSectionLabel(section);
      if (window.getComputedStyle(element).position === 'static')
        element.dataset.editorPositionStatic = 'true';
      const label = document.createElement('span');
      label.className = 'storefront-editor-selection-label';
      label.textContent = storefrontEditorSectionLabel(section);
      label.setAttribute('aria-hidden', 'true');
      element.append(label);
      if (scroll)
        element.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'auto'
            : 'smooth',
          block: 'center',
        });
    }
  }
  function patch(value: StorefrontAppearance) {
    if (value.template) return;
    for (const [key, token] of Object.entries(storefrontThemeVariables(value)))
      document.documentElement.style.setProperty(key, token);
    document.documentElement.dataset.storefrontHover = value.buttonHover;
    const sizes = document.getElementById('storefront-text-sizes');
    if (sizes) sizes.textContent = storefrontTextSizeCss(value);
    const content = (selector: string, text: string) =>
      document.querySelectorAll(selector).forEach((node) => {
        node.textContent = text;
      });
    content('[data-home-text="title"]', value.homepage.title || embedded.name);
    content(
      '[data-home-text="introduction"]',
      value.homepage.introduction || vendorHeroIntroduction,
    );
    for (const key of Object.keys(storefrontTextFields) as StorefrontTextKey[])
      content(
        `[data-storefront-text="${key}"]`,
        storefrontText(value, key, embedded.name),
      );
    content(
      '[data-editor-section="featured"] .ui-section-heading h2',
      storefrontText(value, 'featuredHeading'),
    );
    content(
      '[data-about-blurb]',
      value.vendor?.aboutUseLegacyStory
        ? value.homepage.story
        : (value.vendor?.aboutBlurb ?? value.homepage.story),
    );
    const hero = document.querySelector<HTMLElement>('.harvest-hero-visual');
    if (hero) hero.dataset.heroShape = value.vendor?.heroShape ?? 'dome';
    const aboutImage = document.querySelector<HTMLImageElement>(
      '[data-editor-section="about"] img',
    );
    if (aboutImage) {
      aboutImage.dataset.heroShape = value.vendor?.aboutShape ?? 'rounded';
      aboutImage.alt = value.vendor?.aboutAlt || embedded.name;
    }
    content('[data-story-title]', value.about.title);
    for (const section of aboutSections(value.about)) {
      const node = document.querySelector<HTMLElement>(
        `[data-editor-section="story:${section.id}"]`,
      );
      if (!node) continue;
      node.dataset.imagePosition = section.imagePosition;
      node.dataset.textAlign = section.textAlign ?? 'left';
      node.dataset.imageSize = section.imageSize ?? 'medium';
      for (const field of ['heading', 'body'] as const) {
        const text = node.querySelector(`[data-story-field="${field}"]`);
        if (text) text.textContent = section[field];
      }
      const image = node.querySelector<HTMLImageElement>('img');
      if (image) {
        image.alt = section.alt;
        image.dataset.heroShape = section.shape;
        const frame = image.closest<HTMLElement>('.story-image-frame');
        if (frame) frame.dataset.storyShape = section.shape;
        if (section.shape.startsWith('natural')) {
          image.removeAttribute('width');
          image.removeAttribute('height');
        } else {
          image.setAttribute('width', '960');
          image.setAttribute('height', '960');
        }
      }
    }
    const cta = value.about.cta ?? defaultAboutCta;
    for (const field of ['heading', 'text', 'label'] as const)
      content(
        `[data-editor-section="story-cta"] [data-story-cta="${field}"]`,
        cta[field],
      );
    const ctaLink = document.querySelector<HTMLAnchorElement>(
      '[data-editor-section="story-cta"] a',
    );
    if (ctaLink) ctaLink.setAttribute('href', cta.destination);
    config = value;
  }
  window.addEventListener('message', (event) => {
    if (
      event.source !== window.parent ||
      event.origin !== parentOrigin ||
      event.data?.protocol !== 'storefront-editor-v1'
    )
      return;
    const message = event.data;
    if (
      message.type !== 'update' ||
      !storefrontPreviewPath(message.path) ||
      typeof message.token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(message.token) ||
      !Number.isFinite(message.expiresAt) ||
      message.expiresAt <= Date.now() ||
      !isStorefrontEditorSection(message.section) ||
      !['inspect', 'browse'].includes(message.mode)
    )
      return;
    const parsed = storefrontAppearanceSchema.safeParse(message.config);
    if (!parsed.success) return;
    expiry = message.expiresAt;
    document.documentElement.dataset.editorPreview = 'true';
    document.documentElement.dataset.editorInspect = String(
      message.mode === 'inspect',
    );
    select(message.section, message.scroll === true);
    clearTimeout(timer);
    if (
      config &&
      path === message.path &&
      structural(config) === structural(parsed.data)
    ) {
      patch(parsed.data);
      send({ type: 'rendered', path });
      return;
    }
    const value = parsed.data;
    // A same-origin POST navigation gets Astro's real HTML, styles, scripts and per-page CSP.
    timer = setTimeout(
      () => {
        if (Date.now() >= expiry) return;
        send({ type: 'loading' });
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/storefront-editor-preview/render';
        const field = document.createElement('input');
        field.type = 'hidden';
        field.name = 'payload';
        field.value = JSON.stringify({
          token: message.token,
          config: value,
          path: message.path,
          scroll: path === message.path ? window.scrollY : 0,
        });
        form.append(field);
        document.body.append(form);
        form.submit();
      },
      config ? 300 : 0,
    );
  });
  document.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (document.documentElement.dataset.editorInspect === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
        const section = event.target.closest<HTMLElement>(
          '[data-editor-section]',
        )?.dataset.editorSection;
        if (section && isStorefrontEditorSection(section)) {
          select(section as StorefrontEditorSection);
          send({ type: 'select', section });
        }
        return;
      }
      const link = event.target.closest('a');
      if (link) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const url = new URL(link.href);
        if (
          url.origin === window.location.origin &&
          storefrontPreviewPath(url.pathname) &&
          !url.search
        ) {
          if (url.hash && url.pathname === path)
            document.getElementById(url.hash.slice(1))?.scrollIntoView();
          else send({ type: 'navigate', path: url.pathname });
        } else send({ type: 'blocked' });
      } else if (event.target.closest('button')) {
        if (
          event.target.closest(
            '[data-farmhouse-carousel] [data-carousel-direction]',
          )
        )
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
        send({ type: 'blocked' });
      }
    },
    true,
  );
  document.addEventListener(
    'submit',
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      send({ type: 'blocked' });
    },
    true,
  );
  // Expired frames discard private HTML even if the editor was left idle.
  setInterval(() => {
    if (expiry && Date.now() >= expiry) {
      document.body.replaceChildren();
      config = undefined;
      send({ type: 'expired' });
      expiry = 0;
    }
  }, 1000);
  window.addEventListener('load', () => {
    window.scrollTo(0, embedded.state?.scroll ?? 0);
    select(selected);
  });
  send({ type: 'ready' });
}
