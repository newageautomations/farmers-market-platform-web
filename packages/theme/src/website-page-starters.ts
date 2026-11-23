import { createWebsiteSection } from './website-sections';
import type { SectionTarget, WebsiteSection } from './website-section-contract';

/**
 * Starter content for a market's About page. The copy is written to the
 * manager: each section explains what belongs there, so the page can be
 * composed by replacing the text and photos. It is only seeded when the page
 * is first switched on and nothing has been written yet.
 */
export function aboutStarterSections(target: SectionTarget): {
  story: {
    id: string;
    layout: 'text-image';
    heading: string;
    body: string;
    imageAssetId: null;
    image: string;
    alt: string;
    shape: 'natural';
    imagePosition: 'right';
    textAlign: 'left';
    imageSize: 'medium';
    visible: true;
  };
  after: WebsiteSection[];
} {
  const people = createWebsiteSection(
    'image-with-text',
    'image-with-text-about-people',
    target,
  );
  people.content = {
    heading: 'The people behind the market',
    body: 'Introduce the organizers, volunteers and growers who make market day happen. Add a group photo, then say who they are and why they care. Keep it warm and personal: a few sentences is plenty.',
    image: { assetId: null, url: '', alt: '' },
    label: '',
    destination: '/vendors',
  };
  people.presentation.imageSide = 'right';

  const values = createWebsiteSection(
    'feature-grid',
    'feature-grid-about-values',
    target,
  );
  values.content.heading = 'What makes our market special';
  values.content.body =
    'Use three short points that set your market apart. Change the icons, titles and descriptions to match.';
  values.content.items = [
    {
      id: 'feature-about-local',
      title: 'Grown close to home',
      description: 'Say where your vendors farm and make their goods.',
      icon: 'map-pin',
    },
    {
      id: 'feature-about-people',
      title: 'Meet the makers',
      description: 'Explain how shoppers can talk with the people who grow it.',
      icon: 'heart',
    },
    {
      id: 'feature-about-season',
      title: 'Always in season',
      description: 'Describe what changes through the year at your market.',
      icon: 'carrot',
    },
  ];

  const gallery = createWebsiteSection(
    'image-gallery',
    'image-gallery-about-day',
    target,
  );
  gallery.content.heading = 'A morning at the market';
  gallery.content.body =
    'Add four to eight photos that show market day: the stalls, the produce, the crowd and the little moments. Wide photos work best here.';

  const mission = createWebsiteSection('text', 'text-about-mission', target);
  mission.content = {
    heading: 'Our mission',
    body: 'Finish with one or two sentences about what your market is for, such as feeding your neighbours, supporting small farms or bringing the town together. This is the line people should remember.',
  };
  mission.presentation.alignment = 'center';

  const visit = createWebsiteSection(
    'cta-banner',
    'cta-banner-about-visit',
    target,
  );
  visit.content = {
    heading: 'Come see us on market day',
    body: 'Invite visitors to your next market date. You can change this button to point anywhere on your site.',
    label: 'See market dates',
    destination: '/market-dates',
  };

  return {
    story: {
      id: 'about-starter-story',
      layout: 'text-image',
      heading: 'How our market began',
      body: 'Tell the story of your market in a few short paragraphs. When did it start, who started it and why? What was the first market day like, and how has it grown since? Add a photo from the early days if you have one.',
      imageAssetId: null,
      image: '',
      alt: '',
      shape: 'natural',
      imagePosition: 'right',
      textAlign: 'left',
      imageSize: 'medium',
      visible: true,
    },
    after: [people, values, gallery, mission, visit],
  };
}
