---
slug: /
---

# Introduction

`@jupyter/eslint-plugin` enforces code quality and project-specific standards for Jupyter core and extensions with early error catching and best practices enforcement.

## What it does

This plugin is built for JupyterLab extensions and core package development. It enforces conventions that are easy to miss during development but costly in production.

### Who should use it

- JupyterLab extension authors
- Maintainers of Jupyter Projects

## Further reading

- [Catching Jupyter-specific bugs before CI does](https://blog.jupyter.org/posts/2026/catching-jupyter-specific-bugs-before-ci-does/) (Jupyter Blog) - announces the plugin and explains the motivation: framework contracts around plugins, commands, tokens, settings schemas and translations that TypeScript cannot check.
- [Your AI Agent Ignored AGENTS.md. Your Linter Won't Let It.](https://openteams.com/engineering-blog/lint-rules-for-ai-agents/) - explains how the plugin's rules give AI coding agents actionable errors for Jupyter conventions that are relatively rare in their training corpus.

## Acknowledgments

Work on this plugin was funded by the Jupyter Foundation through its Community Funding program. See the [Custom Linting for JupyterLab](https://jupyter-governance.github.io/funding-proposals/projects/2025/custom-linting-for-jupyterlab/) funding report for a summary of the work completed.

## Versioning

This project follows [ESLint's Semantic Versioning Policy](https://github.com/eslint/eslint#semantic-versioning-policy). For details on version changes and breaking changes, see the [releases page](https://github.com/jupyterlab/eslint-plugin/releases).

## Changelog

For a complete history of changes, see the [changelog](https://github.com/jupyterlab/eslint-plugin/releases).

## License

This project is licensed under the [Modified BSD License](https://github.com/jupyterlab/eslint-plugin/blob/main/LICENSE).
