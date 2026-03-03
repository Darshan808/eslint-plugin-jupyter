/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Config } from '@docusaurus/types';
import type { Options as PresetClassicOptions } from '@docusaurus/preset-classic';

const githubUrl = 'https://github.com/jupyterlab/eslint-plugin';

const presetClassicOptions: PresetClassicOptions = {
  docs: {
    path: 'docs',
    routeBasePath: '/',
    sidebarPath: require.resolve('./sidebars.ts'),
    editUrl: `${githubUrl}/edit/main/website/`
  },
  blog: false,
  theme: {
    customCss: require.resolve('./src/css/custom.css')
  }
};

const config: Config = {
  title: 'Eslint Plugin Jupyter',
  tagline: 'ESLint rules for Jupyter core and extensions with early error catching and best practices enforcement',
  favicon: '/jupyter_logo.svg',
  url: 'https://example.com', // TODO: Replace with actual docs URL
  baseUrl: '/',
  onBrokenLinks: 'throw',
  markdown: {
    format: 'md',
    hooks: {
      onBrokenMarkdownLinks: 'throw'
    }
  },
  organizationName: 'jupyter',
  projectName: 'eslint-plugin',
  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },
  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        docsRouteBasePath: '/',
        hashed: true,
        indexBlog: false,
        indexDocs: true,
        indexPages: false,
        language: ['en']
      }
    ]
  ],
  presets: [['classic', presetClassicOptions]],
  themeConfig: {
    navbar: {
      title: 'ESLint Plugin Jupyter',
      logo: {
        alt: 'Jupyter Logo',
        src: '/jupyter_logo.svg',
        width: 32,
        height: 32
      },
      items: [
        {
          to: '/',
          label: 'Docs',
          position: 'left'
        },
        {
          to: '/rules',
          label: 'Rules',
          position: 'left'
        },
        {
          href: githubUrl,
          position: 'right',
          className: 'navbar-item-github',
          'aria-label': 'GitHub repository'
        },
        {
          href: 'https://jupyter.org',
          position: 'right',
          className: 'navbar-item-jupyter',
          'aria-label': 'Jupyter'
        },
        {
          type: 'search',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()}, Jupyter Development Team. Built with Docusaurus.`
    }
  }
};

export default config;
