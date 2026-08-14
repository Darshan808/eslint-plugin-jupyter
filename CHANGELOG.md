# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## 1.1.0

([Full Changelog](https://github.com/jupyterlab/eslint-plugin/compare/v1.0.1...a810795b233b803ff01d30279a93c1b2ff529b9f))

### Enhancements made

- Drop owner constructor maps, replace by type-aware heuristic [#93](https://github.com/jupyterlab/eslint-plugin/pull/93) ([@krassowski](https://github.com/krassowski), [@Darshan808](https://github.com/Darshan808), [@MUFFANUJ](https://github.com/MUFFANUJ))
- Add `no-dynamic-translation` rule [#91](https://github.com/jupyterlab/eslint-plugin/pull/91) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Fix false positives in disposable ownership rules, improve API [#89](https://github.com/jupyterlab/eslint-plugin/pull/89) ([@krassowski](https://github.com/krassowski), [@MUFFANUJ](https://github.com/MUFFANUJ))
- Add `require-signal-cleanup`, `require-signal-this-arg` and `prefer-signal-this-arg` [#78](https://github.com/jupyterlab/eslint-plugin/pull/78) ([@Darshan808](https://github.com/Darshan808), [@Copilot](https://github.com/Copilot), [@krassowski](https://github.com/krassowski))
- Add disposable ownership lint rules [#77](https://github.com/jupyterlab/eslint-plugin/pull/77) ([@MUFFANUJ](https://github.com/MUFFANUJ), [@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Add `incorrect-translator-usage` rule [#76](https://github.com/jupyterlab/eslint-plugin/pull/76) ([@jtpio](https://github.com/jtpio), [@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Add `galata-prefer-filebrowser-helper` rule [#73](https://github.com/jupyterlab/eslint-plugin/pull/73) ([@Darshan808](https://github.com/Darshan808), [@Copilot](https://github.com/Copilot), [@MUFFANUJ](https://github.com/MUFFANUJ), [@krassowski](https://github.com/krassowski))
- Add `jupyter/no-pageconfig-base-url` [#68](https://github.com/jupyterlab/eslint-plugin/pull/68) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Bugs fixed

- Handle edge cases for signal rules [#98](https://github.com/jupyterlab/eslint-plugin/pull/98) ([@krassowski](https://github.com/krassowski), [@Darshan808](https://github.com/Darshan808))
- Reduce FPs, improve suggestions in `jupyter/galata-prefer-filebrowser-helper` [#97](https://github.com/jupyterlab/eslint-plugin/pull/97) ([@krassowski](https://github.com/krassowski), [@Darshan808](https://github.com/Darshan808))

### Maintenance and upkeep improvements

- Fix unrelated downstream tests failures [#95](https://github.com/jupyterlab/eslint-plugin/pull/95) ([@krassowski](https://github.com/krassowski), [@Darshan808](https://github.com/Darshan808))
- Fix pre-commit so it actually lints [#84](https://github.com/jupyterlab/eslint-plugin/pull/84) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Documentation improvements

- Add type definition for correct `oneOf` example [#70](https://github.com/jupyterlab/eslint-plugin/pull/70) ([@krassowski](https://github.com/krassowski), [@Darshan808](https://github.com/Darshan808))
- Add `CONTRIBUTING.md` [#67](https://github.com/jupyterlab/eslint-plugin/pull/67) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Other merged PRs

- Bump the npm_and_yarn group across 1 directory with 2 updates [#92](https://github.com/jupyterlab/eslint-plugin/pull/92) ([@Darshan808](https://github.com/Darshan808))
- Bump the npm_and_yarn group across 2 directories with 2 updates [#88](https://github.com/jupyterlab/eslint-plugin/pull/88) ([@Darshan808](https://github.com/Darshan808))
- Bump the npm_and_yarn group across 1 directory with 2 updates [#82](https://github.com/jupyterlab/eslint-plugin/pull/82) ([@Darshan808](https://github.com/Darshan808))
- Bump fast-uri from 3.1.2 to 3.1.4 in /website in the npm_and_yarn group across 1 directory [#81](https://github.com/jupyterlab/eslint-plugin/pull/81) ([@Darshan808](https://github.com/Darshan808))
- Bump websocket-driver from 0.7.4 to 0.7.5 in /website in the npm_and_yarn group across 1 directory [#80](https://github.com/jupyterlab/eslint-plugin/pull/80) ([@Darshan808](https://github.com/Darshan808))
- Bump js-yaml from 3.14.2 to 3.15.0 in /website in the npm_and_yarn group across 1 directory [#79](https://github.com/jupyterlab/eslint-plugin/pull/79) ([@Darshan808](https://github.com/Darshan808))
- Bump the npm_and_yarn group across 1 directory with 7 updates [#72](https://github.com/jupyterlab/eslint-plugin/pull/72) ([@Darshan808](https://github.com/Darshan808))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/jupyterlab/eslint-plugin/graphs/contributors?from=2026-05-15&to=2026-08-11&type=c))

@Copilot ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ACopilot+updated%3A2026-05-15..2026-08-11&type=Issues)) | @Darshan808 ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ADarshan808+updated%3A2026-05-15..2026-08-11&type=Issues)) | @jtpio ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Ajtpio+updated%3A2026-05-15..2026-08-11&type=Issues)) | @krassowski ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Akrassowski+updated%3A2026-05-15..2026-08-11&type=Issues)) | @MUFFANUJ ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3AMUFFANUJ+updated%3A2026-05-15..2026-08-11&type=Issues))

<!-- <END NEW CHANGELOG ENTRY> -->

## 1.0.1

([Full Changelog](https://github.com/jupyterlab/eslint-plugin/compare/v1.0.0...ce8937dde88f13815d6a2f5c82c925bfa4fe6427))

### Bugs fixed

- Fix unresolved types in `plugin-activation-arg` for `'optionalNotNullable'` [#64](https://github.com/jupyterlab/eslint-plugin/pull/64) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Add `jsonc-eslint-parser` as runtime dep [#60](https://github.com/jupyterlab/eslint-plugin/pull/60) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Other merged PRs

- Bump the npm_and_yarn group across 1 directory with 2 updates [#59](https://github.com/jupyterlab/eslint-plugin/pull/59) ([@krassowski](https://github.com/krassowski))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/jupyterlab/eslint-plugin/graphs/contributors?from=2026-05-08&to=2026-05-15&type=c))

@Darshan808 ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ADarshan808+updated%3A2026-05-08..2026-05-15&type=Issues)) | @krassowski ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Akrassowski+updated%3A2026-05-08..2026-05-15&type=Issues))

## 1.0.0

([Full Changelog](https://github.com/jupyterlab/eslint-plugin/compare/v0.0.5...3806a8cd1b9b95fd09435b6a7c976b3c750a69b2))

### Enhancements made

- Support aliased imports [#56](https://github.com/jupyterlab/eslint-plugin/pull/56) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Add `no-schema-enum` rule: forbid enum in settings schema, suggest `oneOf` [#55](https://github.com/jupyterlab/eslint-plugin/pull/55) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- `plugin-activation-args`: enforce `| null` on optional token parameters [#54](https://github.com/jupyterlab/eslint-plugin/pull/54) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Add `require-soft-assertions-before-snapshots` rule [#53](https://github.com/jupyterlab/eslint-plugin/pull/53) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Remove `tsconfig.test.json` [#57](https://github.com/jupyterlab/eslint-plugin/pull/57) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Documentation improvements

- Update docs to include `jupyter/no-schema-enum` as recommended rule. [#58](https://github.com/jupyterlab/eslint-plugin/pull/58) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Other merged PRs

- Bump the npm_and_yarn group across 2 directories with 7 updates [#47](https://github.com/jupyterlab/eslint-plugin/pull/47) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/jupyterlab/eslint-plugin/graphs/contributors?from=2026-04-21&to=2026-05-08&type=c))

@Darshan808 ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ADarshan808+updated%3A2026-04-21..2026-05-08&type=Issues)) | @krassowski ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Akrassowski+updated%3A2026-04-21..2026-05-08&type=Issues))

## 0.0.5

([Full Changelog](https://github.com/jupyterlab/eslint-plugin/compare/v0.0.4...dedcfee6479efba4cdcab5fe873a81c9d9bd1c89))

### Enhancements made

- Improve `@jupyter/no-untranslated-string` for `JSX` [#49](https://github.com/jupyterlab/eslint-plugin/pull/49) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/jupyterlab/eslint-plugin/graphs/contributors?from=2026-04-18&to=2026-04-21&type=c))

@Darshan808 ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ADarshan808+updated%3A2026-04-18..2026-04-21&type=Issues)) | @krassowski ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Akrassowski+updated%3A2026-04-18..2026-04-21&type=Issues))

## 0.0.4

([Full Changelog](https://github.com/jupyterlab/eslint-plugin/compare/v0.0.3...ba6ec78cf61838065b13d31ed24b382b5007258a))

### Enhancements made

- Add `jupyter/no-translation-concatenation` [#44](https://github.com/jupyterlab/eslint-plugin/pull/44) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Add a new rule `jupyter/no-untranslated-string` [#41](https://github.com/jupyterlab/eslint-plugin/pull/41) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Add `jupyter/token-format` to enforce plugin token naming convention [#40](https://github.com/jupyterlab/eslint-plugin/pull/40) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Report empty descriptions [#37](https://github.com/jupyterlab/eslint-plugin/pull/37) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Improve error message when argument order matches but type annotation is incorrect [#36](https://github.com/jupyterlab/eslint-plugin/pull/36) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Fix `prep-release` workflow [#48](https://github.com/jupyterlab/eslint-plugin/pull/48) ([@Darshan808](https://github.com/Darshan808))
- Add jupyterlite to downstream tests. [#45](https://github.com/jupyterlab/eslint-plugin/pull/45) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Fix downstream lint config [#38](https://github.com/jupyterlab/eslint-plugin/pull/38) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Other merged PRs

- Bump the npm_and_yarn group across 1 directory with 2 updates [#32](https://github.com/jupyterlab/eslint-plugin/pull/32) ([@Darshan808](https://github.com/Darshan808))
- Bump the npm_and_yarn group across 2 directories with 5 updates [#30](https://github.com/jupyterlab/eslint-plugin/pull/30) ([@Darshan808](https://github.com/Darshan808))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/jupyterlab/eslint-plugin/graphs/contributors?from=2026-03-30&to=2026-04-18&type=c))

@Darshan808 ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ADarshan808+updated%3A2026-03-30..2026-04-18&type=Issues)) | @krassowski ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Akrassowski+updated%3A2026-03-30..2026-04-18&type=Issues))

## 0.0.3

([Full Changelog](https://github.com/jupyterlab/eslint-plugin/compare/v0.0.2...5f281b51004d8f7aabc8462d00bd252d4166391e))

### Enhancements made

- Type-aware activation argument checking for `@jupyter/plugin-activation-args` rule [#31](https://github.com/jupyterlab/eslint-plugin/pull/31) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Add Downstream Integration Test again Jupyter Projects [#33](https://github.com/jupyterlab/eslint-plugin/pull/33) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Use `ESLintUtils.RuleCreator` instead for `TSESTree` types [#27](https://github.com/jupyterlab/eslint-plugin/pull/27) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Documentation improvements

- Docs follow up [#24](https://github.com/jupyterlab/eslint-plugin/pull/24) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/jupyterlab/eslint-plugin/graphs/contributors?from=2026-03-09&to=2026-03-30&type=c))

@Darshan808 ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ADarshan808+updated%3A2026-03-09..2026-03-30&type=Issues)) | @krassowski ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Akrassowski+updated%3A2026-03-09..2026-03-30&type=Issues))

## 0.0.2

([Full Changelog](https://github.com/jupyterlab/eslint-plugin/compare/e46b2b4eebe412038db2574ef0d0ce31370e8722...aaf9c9acfa9fb2807f286d8ea5dc58d59d96b2c2))

### Enhancements made

- Support service manager plugins [#21](https://github.com/jupyterlab/eslint-plugin/pull/21) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Enhance first argument validation (`jupyter/plugin-activation-args`) [#16](https://github.com/jupyterlab/eslint-plugin/pull/16) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- `check-release` is Green 🎉 [#13](https://github.com/jupyterlab/eslint-plugin/pull/13) ([@Darshan808](https://github.com/Darshan808))
- Restore `check-release` workflow and add `CHANGELOG.md` file [#11](https://github.com/jupyterlab/eslint-plugin/pull/11) ([@Darshan808](https://github.com/Darshan808))
- Add License Header and Workflow [#10](https://github.com/jupyterlab/eslint-plugin/pull/10) ([@Darshan808](https://github.com/Darshan808))
- Add workflows for easier publishing 🚀 [#5](https://github.com/jupyterlab/eslint-plugin/pull/5) ([@Darshan808](https://github.com/Darshan808))

### Bugs fixed

- Support qualified tokens [#22](https://github.com/jupyterlab/eslint-plugin/pull/22) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Sync version after initial release [#19](https://github.com/jupyterlab/eslint-plugin/pull/19) ([@krassowski](https://github.com/krassowski))
- Use `jupyter` namespace i.e `@jupyter/eslint-plugin` [#18](https://github.com/jupyterlab/eslint-plugin/pull/18) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Fix URLs after migration [#15](https://github.com/jupyterlab/eslint-plugin/pull/15) ([@Darshan808](https://github.com/Darshan808), [@krassowski](https://github.com/krassowski))
- Bump minimatch from 3.1.2 to 3.1.5 in the npm_and_yarn group across 1 directory [#14](https://github.com/jupyterlab/eslint-plugin/pull/14) ([@Darshan808](https://github.com/Darshan808))

### Documentation improvements

- Initial documentation [#20](https://github.com/jupyterlab/eslint-plugin/pull/20) ([@Darshan808](https://github.com/Darshan808), [@Copilot](https://github.com/Copilot), [@krassowski](https://github.com/krassowski))

### Other merged PRs

- Improve tests coverage 🔥 [#4](https://github.com/jupyterlab/eslint-plugin/pull/4) ([@Darshan808](https://github.com/Darshan808))
- More migrations from `js` to `mjs` [#2](https://github.com/jupyterlab/eslint-plugin/pull/2) ([@Darshan808](https://github.com/Darshan808))
- Make CI green. [#1](https://github.com/jupyterlab/eslint-plugin/pull/1) ([@Darshan808](https://github.com/Darshan808))

### Contributors to this release

The following people contributed discussions, new ideas, code and documentation contributions, and review.
See [our definition of contributors](https://github-activity.readthedocs.io/en/latest/use/#how-does-this-tool-define-contributions-in-the-reports).

([GitHub contributors page for this release](https://github.com/jupyterlab/eslint-plugin/graphs/contributors?from=2026-01-29&to=2026-03-09&type=c))

@Copilot ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ACopilot+updated%3A2026-01-29..2026-03-09&type=Issues)) | @Darshan808 ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3ADarshan808+updated%3A2026-01-29..2026-03-09&type=Issues)) | @krassowski ([activity](https://github.com/search?q=repo%3Ajupyterlab%2Feslint-plugin+involves%3Akrassowski+updated%3A2026-01-29..2026-03-09&type=Issues))
