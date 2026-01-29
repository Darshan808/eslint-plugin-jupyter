import { RuleTester } from 'eslint';
import jupyterCommandDescribedBy from '../src/rules/jupyter-command-described-by';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
});

ruleTester.run('jupyter-command-described-by', jupyterCommandDescribedBy, {
    valid: [
        {
            code: `
                app.commands.addCommand(CommandIDs.noArgsTest, {
                    label: 'Simple Test',
                    execute: () => {
                        console.log('test');
                    },
                    describedBy: {
                        args: {
                            type: 'object',
                            properties: {}
                        }
                    }
                });
            `,
        },
        {
            code: `
                test.addCommand('test:execute', {
                    label: 'Test Execute',
                    execute: (args) => {
                        console.log(args.value);
                    },
                    describedBy: {
                        args: {
                            type: 'object',
                            properties: {
                                value: { type: 'string' }
                            }
                        }
                    }
                });
            `,
        },
    ],

    invalid: [
        {
            code: `
                app.commands.addCommand(CommandIDs.test, {
                    label: 'Test Command',
                    execute: (args) => {
                        console.log(args.value);
                    }
                });
            `,
            errors: [
                {
                    messageId: 'missingDescribedBy',
                },
            ],
        },
        {
            code: `
                test.addCommand(CommandIDs.test, {
                    label: 'Test Command',
                    execute: () => {
                        console.log('test');
                    }
                });
            `,
            errors: [
                {
                    messageId: 'missingDescribedBy',
                },
            ],
        },
    ],
});
