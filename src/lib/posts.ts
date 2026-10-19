import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n/ui';

export type Post = CollectionEntry<'posts'>;

// Posts written in this locale, plus English posts not yet translated, newest first.
export async function getPostsForLocale(locale: Locale): Promise<Post[]> {
  const all = await getCollection('posts');
  const own = all.filter((p) => p.filePath?.includes(`/posts/${locale}/`));
  const seen = new Set(own.map((p) => p.data.slug));
  const fallback = all.filter((p) => p.filePath?.includes('/posts/en/') && !seen.has(p.data.slug));
  return [...own, ...fallback].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function postImage(post: Post): string | undefined {
  return post.data.image ?? post.body?.match(/<img[^>]+src="(\/images\/[^"]+)"/)?.[1];
}
