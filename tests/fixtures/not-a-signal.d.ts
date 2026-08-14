/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * A type with a `connect` method that is not a Lumino signal — used to
 * verify that the type-aware gate skips lookalike APIs.
 */
export declare class NotASignal {
  connect(cb: () => void): boolean;
  connect(cb: () => void, thisArg: unknown): boolean;
}
