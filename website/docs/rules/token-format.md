# `token-format`

Ensure JupyterLab `Token` ids follow the `<package>:<TokenSymbol>` naming convention where the symbol is a valid JavaScript identifier.

## Rule details

The rule inspects `new Token(id, ...)` expressions where `id` is a string literal and reports when:

- The id contains no `:` separator
- The symbol after `:` is not a valid JavaScript identifier (`/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`)

Non-literal first arguments (variables, template literals) are not checked.

## Incorrect

```ts
export const IFooService = new Token<IFooService>(
  '@test/pkg:foo-service',
  'A foo service'
);
```

## Correct

```ts
export const IFooService = new Token<IFooService>(
  '@test/pkg:IFooService',
  'A foo service'
);
```

## Options

This rule has no options.
