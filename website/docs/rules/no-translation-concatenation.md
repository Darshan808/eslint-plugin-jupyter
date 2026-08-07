# `no-translation-concatenation`

Forbid dynamically built strings inside JupyterLab translation wrapper calls.

## Why

Translation extractors read your source statically — they never run it. So the
message passed to `trans.__()` has to be readable straight from the file. Three
common patterns break that, all for the same reason:

```ts
trans.__('Delete ' + fileName); // concatenation
trans.__(`Delete ${fileName}`); // template interpolation

let text = `Kernel ${status}`; // a dynamic string reaching the call
trans.__(text); //   through a variable
```

In every case the extractor sees no complete message, so the string is never translated. Pure literal concatenation
(`'a' + 'b'`) and a template literal with no interpolation (`` `a` ``) are still
static, so both are allowed.

See [Rules](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules).

## Rule details

The rule checks calls to any `TranslationBundle` method on a recognized
translation bundle — `trans`, `this.trans`, `this._trans`, `props.trans`, or
`this.props.trans`.

For `trans.__(msgid, ...args)`, the rule checks only `msgid`.

Dynamic values should go in later placeholder arguments (`...args`), which are
not checked.

If `msgid` is an identifier, the rule follows it to its definition. A variable
assigned once from a static string is allowed; one built with concatenation or
template interpolation is reported. If the value cannot be resolved reliably
(for example, parameters, imports, or variables reassigned), it is ignored.

Other translation methods follow the same idea: only message-text arguments are
checked.

## Incorrect

```ts
trans.__('Delete ' + fileName);
trans.__(`Delete ${fileName}`);
trans._n('%1 file', `${n} files`, n);

let text = `Kernel ${Text.titleCase(status)}`;
widget.node.textContent = trans.__(text);
```

## Correct

```ts
trans.__('Delete %1', fileName);
trans._n('%1 file', '%1 files', n);

widget.node.textContent = trans.__('Kernel %1', Text.titleCase(status));

// Still static, so still fine:
trans.__('Part 1 of long message.\n' + 'Part 2 of long message.\n');

const MESSAGE = 'Delete';
trans.__(MESSAGE);
```

## Options

This rule has no options.
