# `no-translation-concatenation`

Forbid concatenating dynamic values into JupyterLab translation messages.

## Why

The translation string extractor reads your source statically — it never runs
it. When a message is built with `+`, only the literal parts are in the source,
so the extractor has nothing complete to put in the catalog and the string
never gets translated:

```ts
trans.__('Hello ' + userName); // never extracted
```

Concatenating literals is different. `'a' + 'b'` is only a source-formatting
choice — the extractor still sees the whole message — so it stays allowed, and
is a useful way to break a long string across lines.

See [Rules](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules).

## Rule details

The rule checks calls to any `TranslationBundle` method on a recognized
translation bundle — `trans`, `this.trans`, `this._trans`, `props.trans`, or
`this.props.trans`.

A message argument is reported when its own top-level form is a `+` expression
with at least one operand the extractor cannot read. String literals and
template literals with no interpolation count as readable, so a `+` tree made
only of those is fine.

Only the arguments that carry message text are checked. For
`trans.__(msgid, ...args)` that is `msgid` alone — the placeholder arguments
after it are exactly where dynamic values belong. The other methods follow the
same idea: `_n`/`ngettext` check the singular and plural, `_p`/`pgettext` check
the context and message, and `dcnpgettext` checks everything except its
`domain`, which selects a catalog rather than carrying text.

## Incorrect

```ts
this.trans.__('Hello ' + userName);
trans._p('menu ' + section, 'Open');
trans._n('%1 file', '%1 ' + word, n);
```

## Correct

```ts
this.trans.__('Hello %1', userName);
trans._p('menu', 'Open');
trans._n('%1 file', '%1 files', n);

// Literal concatenation is still readable, so it stays fine:
trans.__('Part 1 of long message.\n' + 'Part 2 of long message.\n');
```

## Options

This rule has no options.
