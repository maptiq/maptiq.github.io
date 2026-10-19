// Utility pages that search engines should not index. They get a
// robots noindex tag and are left out of the sitemap.
export const NOINDEX_SLUGS = ['404-something-went-wrong', 'thank-you'];

export const isNoindexUrl = (url: string) =>
  NOINDEX_SLUGS.some((slug) => new URL(url).pathname.endsWith(`/${slug}/`));
