import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// IDs come from the file path (en/gnsspod, hu/gnsspod), not the slug, so the
// same page can exist once per locale.
const byPath = ({ entry }: { entry: string }) => entry.replace(/\.mdx$/, '');

const seoFields = {
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  ogImage: z.string().optional(),
};

// Rendered as a DOM id so menu links like "/#contact" have a target.
const anchorIdField = { anchorId: z.string().optional() };

const background = z.enum(['white', 'light', 'dark']).default('white');
const button = z.object({ label: z.string(), link: z.string() });
const stat = z.object({ value: z.number(), suffix: z.string().optional(), label: z.string() });

// Each block type maps 1:1 to a component in src/components/blocks/,
// dispatched by BlockRenderer.astro. Keep the two in sync.
const hero = z.object({
  type: z.literal('hero'),
  eyebrow: z.string().optional(),
  heading: z.string(),
  subheading: z.string().optional(),
  image: z.string().optional(),
  buttons: z.array(button).optional(),
  ...anchorIdField,
});

const split = z.object({
  type: z.literal('split'),
  eyebrow: z.string().optional(),
  heading: z.string(),
  body: z.string().optional(),
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  imagePosition: z.enum(['left', 'right']).default('right'),
  background,
  stats: z.array(stat).optional(),
  buttons: z.array(button).optional(),
  ...anchorIdField,
});

const cards = z.object({
  type: z.literal('cards'),
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  intro: z.string().optional(),
  background,
  imageStyle: z.enum(['photo', 'avatar']).default('photo'),
  items: z.array(
    z.object({
      image: z.string().optional(),
      tag: z.string().optional(),
      title: z.string(),
      text: z.string().optional(),
      link: z.string().optional(),
    })
  ),
  ...anchorIdField,
});

const latestPosts = z.object({
  type: z.literal('latestPosts'),
  heading: z.string().optional(),
  intro: z.string().optional(),
  count: z.number().default(3),
  background,
  ...anchorIdField,
});

const ctaBand = z.object({
  type: z.literal('ctaBand'),
  heading: z.string(),
  body: z.string().optional(),
  buttons: z.array(button).optional(),
  ...anchorIdField,
});

const logoRow = z.object({
  type: z.literal('logoRow'),
  heading: z.string().optional(),
  background,
  items: z.array(z.object({ image: z.string(), name: z.string(), link: z.string().optional() })),
  ...anchorIdField,
});

const contactForm = z.object({
  type: z.literal('contactForm'),
  eyebrow: z.string().optional(),
  heading: z.string(),
  body: z.string().optional(),
  background,
  ...anchorIdField,
});

const textBlock = z.object({
  type: z.literal('textBlock'),
  heading: z.string().optional(),
  body: z.string().optional(),
  ...anchorIdField,
});

const imageBlock = z.object({
  type: z.literal('imageBlock'),
  image: z.string(),
  caption: z.string().optional(),
  ...anchorIdField,
});

const buttonCta = z.object({
  type: z.literal('buttonCta'),
  label: z.string(),
  link: z.string(),
  ...anchorIdField,
});

const toggleFaq = z.object({
  type: z.literal('toggleFaq'),
  items: z.array(z.object({ question: z.string(), answer: z.string() })),
  ...anchorIdField,
});

const videoEmbed = z.object({
  type: z.literal('videoEmbed'),
  url: z.string(),
  ...anchorIdField,
});

const sectionBlock = z.discriminatedUnion('type', [
  hero,
  split,
  cards,
  latestPosts,
  ctaBand,
  logoRow,
  contactForm,
  textBlock,
  imageBlock,
  buttonCta,
  toggleFaq,
  videoEmbed,
]);

const pages = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages', generateId: byPath }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    pageType: z.enum(['structured', 'flat']),
    sections: z.array(sectionBlock).optional(),
    ...seoFields,
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/posts', generateId: byPath }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    excerpt: z.string(),
    ...seoFields,
  }),
});

const localizedString = z.object({
  en: z.string(),
  hu: z.string().optional(),
  de: z.string().optional(),
});

const navItem = z.object({
  label: localizedString,
  link: z.string(),
  children: z.array(z.object({ label: localizedString, link: z.string() })).optional(),
});

// One menu for every page. Homepage sections are linked as "/#anchor".
const navigation = defineCollection({
  loader: glob({ pattern: 'navigation.yaml', base: './src/content/settings' }),
  schema: z.object({
    menu: z.array(navItem),
    cta: z.object({ label: localizedString, link: z.string() }).optional(),
  }),
});

const footer = defineCollection({
  loader: glob({ pattern: 'footer.yaml', base: './src/content/settings' }),
  schema: z.object({
    companyName: localizedString,
    tagline: localizedString.partial().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    certification: z
      .object({
        label: localizedString,
        image: z.string(),
        link: z.string().optional(),
        documents: z.array(z.object({ file: z.string(), label: localizedString })).optional(),
      })
      .optional(),
    // Logos funders require on every page (e.g. "Powered by Hiventures").
    badges: z.array(z.object({ image: z.string(), name: z.string(), link: z.string().optional() })).optional(),
    // Széchenyi 2020 infoblock: designed to sit flush in the bottom-left corner.
    cornerLogo: z.object({ image: z.string(), name: z.string() }).optional(),
    links: z.array(z.object({ label: localizedString, link: z.string() })),
    // Attribution that CC BY licences require, shown at the bottom of every page.
    imageCredits: z
      .object({
        title: localizedString,
        items: z.array(
          z.object({
            title: z.string(),
            author: z.string(),
            link: z.string(),
            license: z.string(),
            licenseLink: z.string(),
          })
        ),
      })
      .optional(),
  }),
});

// Web3Forms access keys are public by design: they only allow sending to
// the inbox the key was registered with.
const contact = defineCollection({
  loader: glob({ pattern: 'contact.yaml', base: './src/content/settings' }),
  schema: z.object({
    web3formsAccessKey: z.string().optional(),
  }),
});

export const collections = { pages, posts, navigation, footer, contact };
