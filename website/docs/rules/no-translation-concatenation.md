# `no-translation-concatenation`

Require JupyterLab translation messages to be written as literals at the call
site.

## Why

The translation string extractor reads your source statically — it never runs
it, and it never looks anywhere but the call itself. So whatever message you
want translated has to be spelled out inside the call:

```ts
trans.__('Delete ' + fileName); // concatenation
trans.__(`Delete ${fileName}`); // template interpolation
trans.__(message); // a variable
```

In every case the extractor finds no message to put in the catalog, so the
string is never translated.

This holds even when the variable obviously holds a plain string:

```ts
const MESSAGE = 'Delete';
trans.__(MESSAGE); // still not extracted
```

The extractor does not follow `MESSAGE` to its definition. It sees an
identifier where a message should be, and moves on.

Literal concatenation (`'a' + 'b'`) and template literals with no interpolation
(`` `a` ``) are spelled out in the call, so both are fine.

See [Rules](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules).

## Rule details

The rule checks calls to any `TranslationBundle` method on a recognized
translation bundle — `trans`, `this.trans`, `this._trans`, `props.trans`, or
`this.props.trans`.

A message argument must be one of:

- a string literal,
- a template literal with no interpolation, or
- a `+` concatenation of those.

Anything else is reported: variables, property access, function calls,
conditionals, spread arguments, and interpolated template literals.

Only the arguments that carry message text are checked. For
`trans.__(msgid, ...args)` that is `msgid` alone — the placeholder arguments
after it are exactly where dynamic values belong. The other methods follow the
same idea: `_n`/`ngettext` check the singular and plural, `_p`/`pgettext` check
the context and message, and `dcnpgettext` checks everything except its
`domain`, which selects a catalog rather than carrying text.

## Incorrect

```ts
trans.__('Delete ' + fileName);
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

// Spelled out in the call, so still fine:
trans.__('Part 1 of long message.\n' + 'Part 2 of long message.\n');
```

## Options

This rule has no options.
