/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

export type Slot<SENDER, ARGS> = (sender: SENDER, args: ARGS) => void;

export declare interface ISignal<SENDER, ARGS> {
  connect(slot: Slot<SENDER, ARGS>, thisArg?: unknown): boolean;
  disconnect(slot: Slot<SENDER, ARGS>, thisArg?: unknown): boolean;
}

export declare class Signal<SENDER, ARGS> implements ISignal<SENDER, ARGS> {
  constructor(sender: SENDER);
  connect(slot: Slot<SENDER, ARGS>, thisArg?: unknown): boolean;
  disconnect(slot: Slot<SENDER, ARGS>, thisArg?: unknown): boolean;
  emit(args: ARGS): void;
}

export declare namespace Signal {
  function clearData(object: unknown): void;
  function disconnectAll(object: unknown): void;
  function disconnectReceiver(object: unknown): void;
  function disconnectSender(object: unknown): void;
  function disconnectBetween(sender: unknown, receiver: unknown): void;
}

export declare interface IDisposable {
  readonly isDisposed: boolean;
  readonly disposed: ISignal<this, void>;
  dispose(): void;
}

export declare class NotASignal {
  connect(cb: () => void): boolean;
  connect(cb: () => void, thisArg: unknown): boolean;
}
