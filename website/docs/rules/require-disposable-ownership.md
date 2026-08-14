# `require-disposable-ownership`

Require newly created disposable objects to be owned, returned, assigned to a
field, or disposed.

## Why

Lumino `IDisposable` objects represent lifecycle cleanup. Creating a disposable
and then dropping it usually leaks resources or callbacks that should have been
released later.

## Rule details

The rule checks `new` expressions that create known disposable classes such as
`DisposableDelegate`, `ObservableDisposableDelegate`, `DisposableSet`, and
`ObservableDisposableSet`. When TypeScript type information is available, it
also detects objects typed as `IDisposable` or `IObservableDisposable`.

It ignores disposable objects created directly inside a Jupyter plugin
`activate` function, where services commonly live for the application lifetime.
All three ways of writing one are recognised: an inline `activate` property, a
function named `activate`, and a separate function referenced as
`activate: activateFoo`.

### How a handoff is recognised

Whether a call takes ownership is decided by **what the callee declares**, not by
its name. If the parameter the disposable binds to is itself typed as a
disposable, the API is saying it takes something with a lifecycle:

```ts
// Owned: `Context` declares `factory` as an IModelFactory, which is disposable.
const factory = new TextModelFactory();
const context = new Context({ manager, factory, path });

// Not owned: `console.log` declares `...data: any[]`, so this still reports.
const factory = new TextModelFactory();
console.log(factory);
```

The same applies to options objects: a property of an options bag counts when
the corresponding property of the parameter's type is declared disposable. This
means the rule needs no table of known classes and keeps working for your own
APIs, provided they are typed. Without type information no call is treated as
taking ownership, so the rule falls back to the syntactic patterns below.

### Other accepted ownership patterns

- Adding the object to a typed `DisposableSet`, or passing it as a direct array
  item to `DisposableSet.from(...)` / `ObservableDisposableSet.from(...)`
- Returning it
- Assigning it to an object field or class field initializer
- Storing it in a class-field collection with `this._items.set(...)`
- Calling `.dispose()` immediately
- Storing it in a variable that is later added, returned, assigned to a field,
  or disposed, including one hop through an object or array that is itself
  handed off: `const options = { model }; return new Completer(options);`
- Disposing it unconditionally inside a callback, so the
  `requestAnimationFrame(() => splash.dispose())` and
  `void load().then(() => splash.dispose())` idioms are accepted. Disposal that
  is itself conditional inside the callback is still reported.
- Capturing it in a closure that the declaring function returns, the factory
  pattern: the closure is the function's product, so it owns what it captures.
- Declaring it as an exported binding (`export const tracker = ...`, including
  inside an exported `namespace`): ownership of a module singleton passes to the
  importers of the module. A reassigned export does not count, since only the
  last value can still be reached.

## Incorrect

```ts
new DisposableDelegate(() => {
  cleanup();
});
```

```ts
const disposable = new DisposableDelegate(() => {
  cleanup();
});
console.log(disposable);
```

## Correct

```ts
this._disposables.add(
  new DisposableDelegate(() => {
    cleanup();
  })
);
```

```ts
return new DisposableDelegate(() => {
  cleanup();
});
```

```ts
const disposable = new DisposableDelegate(() => {
  cleanup();
});
disposable.dispose();
```

```ts
class Owner {
  private _disposables = new DisposableSet();
}
```

## Options

### `ownershipFunctionNames`

An escape hatch for APIs whose types cannot express the handoff, most often test
mocks and helpers typed as `any`. Ownership is normally decided from the
declared parameter type, so this list is only needed where that fails.

Function or method names that take ownership of disposable arguments, such as
`add`, `addWidget`, `insertWidget`, and `registerStatusItem`. For the full
default list see the
[`DEFAULT_OWNERSHIP_FUNCTION_NAMES`](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+const+DEFAULT_OWNERSHIP_FUNCTION_NAMES&type=code)
constant.

Names given here are **added** to that default list, so a project only has to
name its own ownership helpers:

```json
{
  "jupyter/require-disposable-ownership": [
    "warn",
    {
      "ownershipFunctionNames": ["ownDisposable", "registerDisposable"]
    }
  ]
}
```

### `extendDefaultOwnershipFunctionNames`

Type: `boolean`, default: `true`.

Set to `false` to replace the default list instead of extending it. With no
`ownershipFunctionNames` of your own, `false` drops the defaults entirely, which
is how to ask for the strictest typed ownership checking:

```json
{
  "jupyter/require-disposable-ownership": [
    "warn",
    { "extendDefaultOwnershipFunctionNames": false }
  ]
}
```
