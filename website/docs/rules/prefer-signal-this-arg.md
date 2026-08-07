# `prefer-signal-this-arg`

Pass a `thisArg` when connecting to a Lumino signal that is cleaned up with `Signal.clearData(this)` or with `signal.disconnect(callback, thisArg)`.

## Why

The [JupyterLab signal patterns](https://jupyterlab.readthedocs.io/en/latest/developer/patterns.html#signals) recommend making connections with `.connect(this._onFoo, this)` wherever possible. The `thisArg` is stored as the connection's **receiver**, and both `signal.disconnect(callback, thisArg)` and `Signal.clearData(thisArg)` match connections by receiver. A connection registered without a `thisArg` has no receiver, so `Signal.clearData(this)` in a `dispose()` method silently fails to remove it — the connection can outlive the object and leak, even when the callback itself works fine at runtime.

This rule is the companion to [require-signal-this-arg](../require-signal-this-arg). The two rules partition the missing-`thisArg` cases:

- a bare class-method reference whose body uses `this` is a **runtime bug** (the method's `this` is unbound when the signal fires) — flagged by `require-signal-this-arg`, recommended at `error`;
- every other one-argument `.connect(callback)` inside a class that cleans up by receiver is a **cleanup concern only** — flagged by this rule, recommended at `warn`.

No call is ever reported by both rules.

## Rule details

The rule reports a one-argument `signal.connect(callback)` call only when **all** of the following hold:

1. the call is inside a class;
2. the class relies on **receiver-based cleanup**, shown by any of:
   - a `Signal.clearData(this)`, `Signal.disconnectReceiver(this)`, `Signal.disconnectAll(this)`, or `Signal.disconnectBetween(sender, this)` call anywhere in the class body (under any local alias of `Signal`),
   - a two-argument `.disconnect(callback, this)` call anywhere in the class body,
   - (with type information) a base class declared in `@lumino/widgets` — Lumino's `Widget.dispose()` calls `Signal.clearData(this)`, so subclasses inherit the receiver-based strategy;
3. the callback is not already torn down by a matching one-argument `.disconnect(callback)` in the same class;
4. it is not the runtime-bug case owned by `require-signal-this-arg`.

Callback shapes covered by (4)'s complement include inline arrow functions and function expressions, arrow-function class properties, class methods that never reference `this`, members not found in the enclosing class, free-variable callbacks, and `.bind(this)` calls.

A **suggestion** (editor quick-fix, not an autofix) is offered to append `, this` as the second argument. It is a suggestion rather than a fix because it changes how the connection is matched at disconnect time and should be reviewed together with the class's teardown.

The rule skips:

- calls that already pass a second argument
- calls outside any class - there is no `this` to pass, and these are typically app-lifetime connections
- classes with no receiver-based cleanup — adding a `thisArg` there changes disconnect matching without buying anything
- callbacks with a matching one-argument `.disconnect(callback)` — that teardown already works and would break
- `x.disposed.connect(...)` wiring — the disposal idiom fires exactly as its sender is torn down, so it is cleaned up sender-side (and it is the pattern [require-signal-cleanup](../require-signal-cleanup) recommends)
- the error-level case owned by `require-signal-this-arg`

When type information is available, receivers whose type does not resolve to Lumino's `ISignal`/`Signal` are ignored.

## Incorrect

```ts
class NotebookWatcher {
  constructor(model: IModel) {
    // Works at runtime (arrow binds `this` lexically), but this connection
    // has no receiver — Signal.clearData(this) cannot remove it.
    model.changed.connect(sender => {
      this.handleChange(sender);
    });
  }

  dispose(): void {
    Signal.clearData(this); // does NOT clear the connection above
  }
}
```

```ts
// Inherited receiver-based cleanup: Widget.dispose() calls
// Signal.clearData(this), so a connection without a thisArg leaks.
class NotebookPanelHeader extends Widget {
  constructor(model: IModel) {
    super();
    model.changed.connect(() => this.update());
  }
}
```

## Correct

```ts
class NotebookWatcher {
  constructor(model: IModel) {
    model.changed.connect(sender => {
      this.handleChange(sender);
    }, this);
  }

  dispose(): void {
    Signal.clearData(this); // clears the connection
  }
}
```

```ts
// A matching bare disconnect is already a working teardown. Adding `, this`
// to the connect() here would stop the disconnect() from matching.
class TableOfContentsFactory {
  createNew(widget: W, context: IContext): void {
    const updateTitle = () => {
      this.setTitle(context.localPath);
    };
    context.pathChanged.connect(updateTitle);

    widget.disposed.connect(() => {
      context.pathChanged.disconnect(updateTitle);
    });
  }
}
```

```ts
// Disposal wiring on a `disposed` signal is cleaned up sender-side
class NotebookWatcher {
  constructor(content: Widget) {
    content.disposed.connect(() => this.dispose());
  }

  dispose(): void {
    // ...
  }
}
```

## Options

This rule has no options.
