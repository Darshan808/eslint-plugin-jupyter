# `require-signal-this-arg`

Require a `thisArg` when connecting a class method that references `this` to a Lumino signal.

## Why

Lumino's `ISignal.connect(callback, thisArg)` invokes the callback with `thisArg` as its receiver. When a class method is passed as a bare function reference, `signal.connect(this._onChanged)`, nothing binds `this` inside the callback to the instance, so any `this.` access in the method body throws or reads the wrong object when the signal fires.

A matching `thisArg` also matters for cleanup: `signal.disconnect(callback, thisArg)` and `Signal.clearData(thisArg)` only remove connections whose receiver matches.

## Rule details

The rule reports `signal.connect(this.method)` calls - exactly one argument, where the argument is a reference to a member of the enclosing class, when the referenced method's body actually uses `this`. Usage inside nested arrow functions counts as arrows inherit `this` lexically; usage only inside nested regular `function`s does not.

A **suggestion** (editor quick-fix, not an autofix) is offered to append `, this` as the second argument. It is not an autofix because inserting a `thisArg` changes runtime behavior and should be reviewed.

The rule skips:

- arrow-function class properties — they capture `this` lexically and need no `thisArg`
- methods that never reference `this`
- getters and setters — `this.x` evaluates the accessor rather than referencing a function
- members not found in the enclosing class (possibly inherited) — skipped conservatively
- calls that already pass a second argument

When type information is available, receivers whose type does not resolve to Lumino's `ISignal`/`Signal` are ignored.

## Incorrect

```ts
class NotebookWatcher {
  constructor(model: IModel) {
    // this._onChanged uses `this` internally — it will not be bound
    // to this instance when the signal fires.
    model.changed.connect(this._onChanged);
  }

  private _onChanged(): void {
    this.update();
  }
}
```

## Correct

```ts
class NotebookWatcher {
  constructor(model: IModel) {
    model.changed.connect(this._onChanged, this);
  }

  private _onChanged(): void {
    this.update();
  }
}
```

```ts
// Arrow-function property: `this` is captured lexically
class NotebookWatcher {
  constructor(model: IModel) {
    model.changed.connect(this._onChanged);
  }

  private _onChanged = (): void => {
    this.update();
  };
}
```

```ts
// Wrapping in an arrow also binds `this` lexically
class NotebookWatcher {
  constructor(model: IModel) {
    model.changed.connect((sender, args) => {
      this.handleChange(sender, args);
    });
  }
}
```

## Options

This rule has no options.
