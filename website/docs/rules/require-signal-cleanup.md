# `require-signal-cleanup`

Require classes that connect to Lumino signals with `this` as the receiver to show a cleanup path.

## Why

Lumino's `ISignal.connect(callback, thisArg)` subscribes forever: the connection is only removed by a matching `.disconnect()` call, by `Signal.clearData(thisArg)`, or when the process ends. There is no automatic cleanup. When an object connects to a signal owned by a longer-lived object and is later discarded without disconnecting, the connection keeps the object alive (a memory leak) and its callback keeps firing on a logically dead instance.

## Rule details

The rule inspects every `signal.connect(callback, this)` call - two arguments, with `this` as the receiver, made inside a class, and reports it when the class shows **no cleanup evidence anywhere in its body**. Any one of the following silences the whole class:

- a call to `Signal.clearData(...)`, `Signal.disconnectReceiver(...)`, `Signal.disconnectAll(...)`, `Signal.disconnectSender(...)`, or `Signal.disconnectBetween(...)` (including via a renamed import of `Signal` from `@lumino/signaling`)
- any `.disconnect(...)` call (covers `dispose()` teardown as well as disconnect-before-reconnect idioms such as a `stopObserving()` helper)
- consuming the return value of a `.connect(...)` call (for example adding it to a disposable collection)
- wiring cleanup through a `disposed`-style signal (`x.disposed.connect(...)`) or delegating via a `this.dispose()` call

The rule is deliberately conservative and skips:

- classes with an `extends` clause — a base class such as Lumino's `Widget` already calls `Signal.clearData(this)` in its inherited `dispose()`
- `.connect()` calls outside any class (module scope, plugin `activate()` functions) — these are typically app-lifetime connections with nothing to leak into
- calls where the second argument is not `this` — another object's lifecycle cannot be traced from here
- single-argument `.connect(callback)` calls — see [require-signal-this-arg](../require-signal-this-arg)

When type information is available, receivers whose type does not resolve to Lumino's `ISignal`/`Signal` are ignored.
## Incorrect

```ts
class NotebookWatcher {
  constructor(sessionContext: ISessionContext) {
    // No dispose(), no clearData, no disconnect anywhere in the class:
    // this connection outlives the watcher.
    sessionContext.kernelChanged.connect(this._onKernelChanged, this);
  }

  private _onKernelChanged(): void {
    // ...
  }
}
```

## Correct

```ts
class NotebookWatcher implements IDisposable {
  constructor(sessionContext: ISessionContext) {
    sessionContext.kernelChanged.connect(this._onKernelChanged, this);
  }

  dispose(): void {
    Signal.clearData(this);
  }

  private _onKernelChanged(): void {
    // ...
  }
}
```

```ts
// Cleanup wired through a disposed signal
class NotebookWatcher {
  constructor(model: IModel, content: Widget) {
    model.changed.connect(this._onChanged, this);
    content.disposed.connect(() => {
      model.changed.disconnect(this._onChanged, this);
    });
  }

  private _onChanged(): void {
    // ...
  }
}
```

```ts
// Inherited cleanup: Widget.dispose() calls Signal.clearData(this)
class NotebookPanelHeader extends Widget {
  constructor(model: IModel) {
    super();
    model.changed.connect(this._onChanged, this);
  }

  private _onChanged(): void {
    // ...
  }
}
```

## Known limitations

The analysis is intentionally scoped to a single class in a single file:

- Cleanup performed by another class (for example the signal's sender disposing itself and clearing its own connections) is invisible; if the receiver class shows no cleanup of its own, it is still reported.
- Conversely, a class that cleans up correctly but whose `dispose()` is never called by its owner (a cross-file bug) is **not** reported.
- Any single piece of cleanup evidence silences the entire class, so a class that disconnects one signal but leaks another is not reported. The rule detects "no cleanup at all", not incomplete cleanup.

## Options

- `additionalCleanupMethods` (`string[]`, default `[]`): additional method names (besides `disconnect`) that count as cleanup evidence when called anywhere in the class. Use this to whitelist project-specific teardown idioms:

```json
{
  "jupyter/require-signal-cleanup": [
    "warn",
    { "additionalCleanupMethods": ["_stopObserving"] }
  ]
}
```
