# Rules

This section documents all rules currently provided by `eslint-plugin-jupyter`.

## Available rules

- [command-described-by](./command-described-by)
- [no-schema-enum](./no-schema-enum)
- [no-translation-concatenation](./no-translation-concatenation)
- [no-untranslated-string](./no-untranslated-string)
- [plugin-activation-args](./plugin-activation-args)
- [plugin-description](./plugin-description)
- [require-soft-assertions-before-snapshots](./require-soft-assertions-before-snapshots)
- [token-format](./token-format)

Each page includes intent, examples, configuration, and when to apply the rule.

## Recommended ruleset

The plugin ships with a recommended configuration that enables all current rules with the following defaults:

| Rule | Level |
| --- | --- |
| [jupyter/plugin-activation-args](./plugin-activation-args) | `error` |
| [jupyter/command-described-by](./command-described-by) | `warn` |
| [jupyter/no-untranslated-string](./no-untranslated-string) | `warn` |
| [jupyter/plugin-description](./plugin-description) | `warn` |
| [jupyter/no-translation-concatenation](./no-translation-concatenation) | `error` |
| [jupyter/token-format](./token-format) | `error` |
| [jupyter/require-soft-assertions-before-snapshots](./require-soft-assertions-before-snapshots) | `warn` ¹ |

¹ Applied only to `**/*.spec.{ts,js}` and `**/*.test.{ts,js}` files.

These defaults are the same in both `jupyterPlugin.configs.recommended` (flat config) and `plugin:@jupyter/eslint-plugin/recommended-legacy`.

For guidance on using these recommended rules, see the [User Guide](../user-guide).
