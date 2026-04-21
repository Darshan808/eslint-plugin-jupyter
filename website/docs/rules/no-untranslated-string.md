# `jupyter/no-untranslated-string`

Require user-facing string literals to be wrapped in a translation call such as `trans.__()`.

## Rule details

The rule reports raw string literals (and template literals without expressions) in the following positions:

### 1. `commands.addCommand()` properties

The `label`, `caption`, and `usage` properties must not contain bare strings. Concise arrow functions returning a raw string (e.g. `() => 'string'`) are also flagged.

```ts
// Incorrect
commands.addCommand('file-download', { label: 'Download' });

// Correct
commands.addCommand('file-download', { label: trans.__('Download') });
commands.addCommand('file-download', { label: () => trans.__('Download') });
```

### 2. `element.setAttribute()` with accessibility attributes

Applies to `aria-label`, `aria-description`, and `title`.

```ts
// Incorrect
node.setAttribute('aria-label', 'main sidebar');

// Correct
node.setAttribute('aria-label', trans.__('main sidebar'));
```

### 3. Direct assignment to `title` and `ariaLabel`

```ts
// Incorrect
element.title = 'Close Tab';
element.ariaLabel = 'Search results';

// Correct
element.title = trans.__('Close Tab');
element.ariaLabel = trans.__('Search results');
```

### 4. Lumino widget title properties

Applies to `*.title.label` and `*.title.caption` assignments.

```ts
// Incorrect
this.title.label = 'Source';

// Correct
this.title.label = trans.__('Source');
```

### 5. `showDialog()` and `new Dialog()` options

The `title` and `body` options must not be raw strings.

```ts
// Incorrect
showDialog({ title: 'Confirm', body: 'Are you sure?' });

// Correct
showDialog({ title: trans.__('Confirm'), body: trans.__('Are you sure?') });
```

### 6. Dialog button builder labels

Applies to `Dialog.okButton`, `Dialog.cancelButton`, `Dialog.warnButton`, and `Dialog.errorButton`.

```ts
// Incorrect
Dialog.okButton({ label: 'Build' });

// Correct
Dialog.okButton({ label: trans.__('Build') });
```

### 7. JSX text content

Raw text between JSX tags and string literals inside `{...}` expressions are flagged.

```tsx
// Incorrect
const el = <span>Error message:</span>;
const el = <span>{'raw string'}</span>;

// Correct
const el = <span>{trans.__('Error message:')}</span>;
```

## Options

```ts
{
  "enforcePunctuation": false
}
```

Set `enforcePunctuation` option to `true` to enforce translation of punctuation characters such as `,`, `-`, `+`, and other symbols.
