// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

/** The user documentation, served by the app's site at /docs (built into the app's output folder). */
export default defineConfig({
  base: '/docs',
  outDir: '../dist/panel/browser/docs',
  integrations: [
    starlight({
      title: 'RPG Manager',
      logo: { src: './src/assets/logo.svg', alt: 'RPG Manager' },
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Français', lang: 'fr' },
        en: { label: 'English', lang: 'en' },
      },
      customCss: ['./src/styles/theme.css'],
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Recursive:wght@300..1000&display=swap',
          },
        },
      ],
      sidebar: [
        {
          label: 'Commencer',
          translations: { en: 'Get started' },
          items: [{ slug: 'getting-started' }],
        },
        {
          label: 'Préparer une partie',
          translations: { en: 'Prepare a game' },
          items: [{ slug: 'worlds' }, { slug: 'items' }, { slug: 'npcs' }, { slug: 'skills' }],
        },
        {
          label: 'Jouer',
          translations: { en: 'Play' },
          items: [
            { slug: 'rooms' },
            { slug: 'table' },
            { slug: 'characters' },
            { slug: 'combat' },
            { slug: 'dice' },
          ],
        },
        {
          label: 'Plus',
          translations: { en: 'More' },
          items: [{ slug: 'tools' }, { slug: 'packs' }, { slug: 'create-pack' }, { slug: 'about' }],
        },
      ],
    }),
  ],
});
