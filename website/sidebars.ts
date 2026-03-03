/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'user-guide',
    'developer-guide',
    {
      type: 'category',
      label: 'Rules',
      link: {
        type: 'generated-index',
        title: 'Rules'
      },
      items: [
        'rules/index',
        'rules/command-described-by',
        'rules/plugin-activation-args',
        'rules/plugin-description'
      ]
    }
  ]
};

export default sidebars;
