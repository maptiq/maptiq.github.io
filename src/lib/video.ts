// Share/watch/shorts URLs refuse to load in an iframe; only embed URLs work.
export function toEmbedUrl(link: string): string | null {
  const yt = link.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1`;
  const vimeo = link.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&dnt=1`;
  return null;
}
