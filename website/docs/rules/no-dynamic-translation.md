# `no-dynamic-translation`

Require JupyterLab translation messages to be written as literals at the call
site.

## Why

The translation string extractor reads your source statically — it never runs
it, and it never looks anywhere but the call itself. So whatever message you
want translated has to be spelled out inside the call:

```ts
trans.__(`Delete ${fileName}`); // template interpolation
trans.__(message); // a variable
```

In both cases the extractor finds no message to put in the catalog, so the
string is never translated.

This holds even when the variable obviously holds a plain string:

```ts
const MESSAGE = 'Delete';
trans.__(MESSAGE); // still not extracted
```

The extractor does not follow `MESSAGE` to its definition. It sees an
identifier where a message should be, and moves on.

See [Rules](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules).

## Rule details

The rule checks calls to any `TranslationBundle` method on a recognized
translation bundle — `trans`, `this.trans`, `this._trans`, `props.trans`, or
`this.props.trans`.

A message argument must be either a string literal or a template literal with
no interpolation. Anything else is reported: variables, property access,
function calls, conditionals, spread arguments, and interpolated template
literals.

Only the arguments that carry message text are checked. For
`trans.__(msgid, ...args)` that is `msgid` alone — the placeholder arguments
after it are exactly where dynamic values belong. The other methods follow the
same idea.

### Known limitation

The rule cannot tell that a value already reached the catalog by another route.
Settings schema text, for example, is extracted from the JSON itself, so
`trans._p('schema', schema.description)` is translated even though the argument
is not a literal — but it is still reported.

There is no option for this; silence the individual call site instead:

```ts
// eslint-disable-next-line jupyter/no-dynamic-translation
trans._p('schema', schema.description);
```

## Incorrect

```ts
trans.__(`Delete ${fileName}`);
trans._n('%1 file', `${n} files`, n);

let text = `Kernel ${Text.titleCase(status)}`;
widget.node.textContent = trans.__(text);

const MESSAGE = 'Delete';
trans.__(MESSAGE);
```

## Correct

```ts
trans.__('Delete %1', fileName);
trans._n('%1 file', '%1 files', n);

widget.node.textContent = trans.__('Kernel %1', Text.titleCase(status));
```

## Options

This rule has no options.
