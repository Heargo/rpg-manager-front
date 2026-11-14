/** The user documentation (the Starlight site under /docs): French at the root, English under /docs/en/. */
export function docsUrl(language: string | undefined): string {
  return language === 'en' ? '/docs/en/' : '/docs/';
}
