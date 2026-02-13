import { RuleTester } from 'eslint';
import commandDescribedBy from '../src/rules/command-described-by';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('command-described-by', commandDescribedBy, {
  valid: [
    {
      code: `
                app.commands.addCommand(CommandIDs.noArgsTest, {
                    label: 'Simple Test',
                    execute: () => {
                        console.log('test');
                    },
                    'describedBy': {
                        args: {
                            type: 'object',
                            properties: {}
                        }
                    }
                });
            `
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
            `
    },
    {
      code: `
                const commandId = 'test:execute';
                test.addCommand(commandId, {
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
            `
    },
    {
      code: `
                test.addCommand('test:execute', 
                  (args) => {
                      console.log(args.value);
                  }
                );
            `
    },
    {
      code: `
                test.addCommand({
                    random_1: 'Test Execute',
                    random_2: (args) => {
                        console.log(args.value);
                    }
                });
            `
    }
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
          messageId: 'missingDescribedBy'
        }
      ]
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
          messageId: 'missingDescribedBy'
        }
      ]
    }
  ]
});
