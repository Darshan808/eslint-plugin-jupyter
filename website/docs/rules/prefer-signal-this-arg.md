# `prefer-signal-this-arg`

Prefer passing a `thisArg` when connecting to a Lumino signal so the connection can be cleaned up.

## Why

The Jupyterlab documentation recommends making signal connections with the pattern `.connect(this._onFoo, this)` wherever possible. The `thisArg` is stored as the connection's **receiver**, and both `signal.disconnect(callback, thisArg)` and `Signal.clearData(thisArg)` match connections by receiver. A connection registered without a `thisArg` has no receiver, so `Signal.clearData(this)` in a `dispose()` method silently fails to remove it — the connection can outlive the object and leak, even when the callback itself works fine at runtime.

This rule is the companion to [require-signal-this-arg](../require-signal-this-arg). The two rules partition the missing-`thisArg` cases:

- a bare class-method reference whose body uses `this` is a **runtime bug** (the method's `this` is unbound when the signal fires) — flagged by `require-signal-this-arg`, recommended at `error`;
- every other one-argument `.connect(callback)` inside a class is a **cleanup concern only** — flagged by this rule, recommended at `warn`.

No call is ever reported by both rules.

## Rule details

Inside a class, the rule reports one-argument `signal.connect(callback)` calls for every callback shape that does not have the runtime `this` bug, including:

- inline arrow functions and function expressions
- arrow-function class properties (lexically bound, so no runtime bug — but still not clearable)
- class methods that never reference `this`
- members not found in the enclosing class (possibly inherited)
- free-variable callbacks and `.bind(this)` calls

A **suggestion** (editor quick-fix, not an autofix) is offered to append `, this` as the second argument. Passing a `thisArg` is valid for every callback shape: it sets the connection's receiver without changing how an arrow function binds `this`.

The rule skips:

- calls that already pass a second argument
- calls outside any class - there is no `this` to pass, and these are typically app-lifetime connections
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
