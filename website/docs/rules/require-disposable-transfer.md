# `require-disposable-transfer`

Require calls returning `IDisposable` to transfer ownership to a caller, field,
or disposable collection.

## Why

Functions that return `IDisposable` hand cleanup responsibility to the caller.
Ignoring the returned value usually means the cleanup path has been lost.

## Rule details

This rule checks factory-like call expressions such as `create*`, `make*`,
`build*`, and `new*` whose return type is compatible with `IDisposable` or
`IObservableDisposable` when TypeScript type information is available. It also
recognizes the known Lumino factories `DisposableSet.from(...)` and
`ObservableDisposableSet.from(...)`.

It ignores disposable values created directly inside a Jupyter plugin `activate`
function, where services commonly live for the application lifetime. All three
ways of writing one are recognised: an inline `activate` property, a function
named `activate`, and a separate function referenced as `activate: activateFoo`.

It accepts common ownership patterns:

- Adding the result to a typed `DisposableSet` or a conventionally named
  disposable collection such as `this._disposables.add(...)`
- Passing the result as a direct array item to `DisposableSet.from(...)` or
  `ObservableDisposableSet.from(...)`
- Returning the result
- Assigning it to an object field
- Storing it in a class-field collection with `this._items.set(...)`
- Calling `.dispose()` immediately
- Storing it in a variable that is later added, returned, assigned to a field,
  or disposed
- Passing it to a configured ownership helper function or default ownership
  sink such as `add`, `addCell`, `addItem`, `addMenu`, `addWidget`,
  `insertWidget`, or `registerStatusItem`
- Passing it through a known owned constructor options object, such as
  `new MainAreaWidget({ content })` or `new Dialog({ body })`
- Disposing it unconditionally inside a callback, so the
  `requestAnimationFrame(() => splash.dispose())` and
  `void load().then(() => splash.dispose())` idioms are accepted. Disposal that
  is itself conditional inside the callback is still reported.
- Declaring it as an exported binding (`export const tracker = ...`, including
  inside an exported `namespace`): ownership of a module singleton passes to the
  importers of the module.

By default, the rule does not report calls whose return value is a borrowed
reference, a fluent initializer, or a registration handle that the caller is not
expected to own. Representative entries are `get`, `find`, `add`, `addCommand`,
`open`, `register`, `set`, and `transform`, plus any name matching
`add*Factory`. For the full list see the
[`DEFAULT_IGNORED_RETURN_FUNCTION_NAMES`](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+const+DEFAULT_IGNORED_RETURN_FUNCTION_NAMES&type=code)
constant.

## Incorrect

```ts
createDisposable();
```

```ts
const disposable = createDisposable();
console.log(disposable);
```

## Correct

```ts
this._disposables.add(createDisposable());
```

```ts
const disposable = createDisposable();
disposable.dispose();
```

```ts
return createDisposable();
```

```ts
const disposables = DisposableSet.from([createDisposable()]);
disposables.dispose();
```

## Options

### `ownershipFunctionNames`

Function or method names that take ownership of disposable arguments, such as
`add`, `addWidget`, `insertWidget`, and `registerStatusItem`. For the full
default list see the
[`DEFAULT_OWNERSHIP_FUNCTION_NAMES`](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+const+DEFAULT_OWNERSHIP_FUNCTION_NAMES&type=code)
constant. Names given here are **added** to that default list.

### `extendDefaultOwnershipFunctionNames`

Type: `boolean`, default: `true`.

Set to `false` to replace the default ownership list instead of extending it.
With no `ownershipFunctionNames` of your own, `false` drops the defaults
entirely.

### `ignoredReturnFunctionNames`

Function or method names whose disposable return value should be treated as
borrowed, or as owned by a registration or session API. Names given here are
**added** to the default list described above.

### `extendDefaultIgnoredReturnFunctionNames`

Type: `boolean`, default: `true`.

Set to `false` to replace the default ignore list instead of extending it. This
also drops the two pattern-based default exemptions, `add*Factory` and
`this._map.set(...)` / `this._map.delete(...)`, since those are part of the same
defaults. With no `ignoredReturnFunctionNames` of your own, `false` ignores
nothing at all.

### `checkAllDisposableReturns`

Type: `boolean`, default: `false`.

By default only factory-named calls (`create*`, `build*`, `make*`, `new*`) have
their disposable return value checked, because any call _might_ return a
disposable and reporting all of them is too noisy. Set this to `true` to check
every call whose return type is disposable.

Extending the defaults, the common case:

```json
{
  "jupyter/require-disposable-transfer": [
    "warn",
    {
      "ownershipFunctionNames": ["ownDisposable", "registerDisposable"],
      "ignoredReturnFunctionNames": ["borrowWidget"]
    }
  ]
}
```

Strictest possible checking, dropping every default exemption:

```json
{
  "jupyter/require-disposable-transfer": [
    "warn",
    {
      "extendDefaultOwnershipFunctionNames": false,
      "extendDefaultIgnoredReturnFunctionNames": false,
      "checkAllDisposableReturns": true
    }
  ]
}
```
