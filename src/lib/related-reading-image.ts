export function relatedReadingImage(url: string): string {
  if (!url) return '';
  try {
    const image = new URL(url);
    if (image.hostname === 'cdn.myanimelist.net' && /^\/r\/\d+x\d+\//.test(image.pathname)) {
      image.pathname = image.pathname.replace(/^\/r\/\d+x\d+\//, '/');
      image.search = '';
    }
    return image.toString();
  } catch {
    return url;
  }
}
