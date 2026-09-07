/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A module which is large as source but almost empty once TypeScript erases
 * the declarations. Only `MODE_ID` survives compilation.
 */

export interface IShortcutTarget {
  id: string;
  command: string;
  keys: string[][];
  selector: string;
  category: string;
  args: Record<string, unknown> | undefined;
  isDefault: boolean;
  disabled: boolean;
}

export interface IShortcutUI {
  readonly targets: IShortcutTarget[];
  readonly filter: string;
  readonly showSelectors: boolean;
  readonly errorMessage: string;
  readonly currentSequence: string[];
  readonly keyBindingsUsed: Record<string, IShortcutTarget>;
  readonly external: IShortcutUIExternal;
}

export interface IShortcutUIExternal {
  getAllShortCutSettings(): Promise<unknown>;
  removeShortCut(key: string): Promise<void>;
  createMenu(): unknown;
  translator: unknown;
  actionRequested: unknown;
}

export interface IShortcutsSettingsLayout {
  shortcuts: IShortcutTarget[];
  [key: string]: unknown;
}

export type ShortcutRegistry = Map<string, IShortcutTarget>;

export type ErrorObject = { takenBy: IShortcutTarget; conflict: string[] };

export const MODE_ID = 'shortcuts';
