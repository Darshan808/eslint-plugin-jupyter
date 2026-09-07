/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

// Small on its own, but it pulls in a large module.

import { HeavyTable } from './lazy-large';

export function createTable(): HeavyTable {
  return new HeavyTable({ rows: 4, columns: 4 });
}
