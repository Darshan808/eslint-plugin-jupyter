# `no-translation-concatenation`

Forbid string concatenation inside JupyterLab translation wrapper calls.

## Why

Translation extractors only pick up static string content in calls like `trans.__("...")`. Pure string-literal concatenation (for example, `"a" + "b"`) is still static and allowed, but concatenation with a variable (for example, `"Hello " + name`) is dynamic and cannot be extracted, so it never gets translated.
See [Rules](https://jupyterlab.readthedocs.io/en/stable/extension/internationalization.html#rules).

## Rule details

The rule reports any `+` binary expression passed as an argument to a translation method (`__`) called on a recognized translation bundle:

- `trans`
- `this.trans`
- `this._trans`
- `this.props.trans`
- `props.trans`

## Incorrect

```ts
this.trans.__("Hello " + userName);
```

## Correct

```ts
this.trans.__("Hello %1", userName);
```

## Options

This rule has no options.
