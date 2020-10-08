module.exports = {
    root: true,
    overrides: [
        {
            files: ['*.ts'],
            env: {
                browser: true,
                es6: true,
                node: true,
            },
            extends: [
                'eslint:recommended',
                'plugin:@typescript-eslint/recommended',
                'prettier',
                'prettier/@typescript-eslint',
                'plugin:jest/recommended',
                'plugin:@angular-eslint/recommended',
            ],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: 'tsconfig.json',
                sourceType: 'module',
            },
            plugins: [
                'eslint-plugin-prefer-arrow',
                'eslint-plugin-jsdoc',
                '@typescript-eslint',
                'header',
                'jest',
            ],
            rules: {
                '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component', 'Page'] }],
                '@typescript-eslint/adjacent-overload-signatures': 'error',
                '@typescript-eslint/ban-types': [
                    'error',
                    {
                        types: {
                            Boolean: {
                                message: 'Use \'boolean\' instead.',
                            },
                            Number: {
                                message: 'Use \'number\' instead.',
                            },
                            String: {
                                message: 'Use \'string\' instead.',
                            },
                            Object: {
                                message: 'Use {} instead.',
                            },
                        },
                    },
                ],
                '@typescript-eslint/explicit-member-accessibility': [
                    'error',
                    {
                        accessibility: 'no-public',
                    },
                ],
                '@typescript-eslint/indent': 'off',
                '@typescript-eslint/member-delimiter-style': [
                    'error',
                    {
                        multiline: {
                            delimiter: 'semi',
                            requireLast: true,
                        },
                        singleline: {
                            delimiter: 'semi',
                            requireLast: false,
                        },
                    },
                ],
                '@typescript-eslint/member-ordering': 'error',
                '@typescript-eslint/naming-convention': [
                    'error',
                    {
                        selector: 'property',
                        modifiers: ['readonly'],
                        format: ['UPPER_CASE'],
                    },
                    {
                        selector: 'property',
                        format: ['camelCase'],
                    },
                ],
                '@typescript-eslint/no-empty-function': 'error',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-explicit-any': [
                    'warn',
                    {
                        fixToUnknown: true,
                    },
                ],
                '@typescript-eslint/no-inferrable-types': [
                    'error',
                    {
                        ignoreParameters: true,
                    },
                ],
                '@typescript-eslint/no-non-null-assertion': 'error',
                '@typescript-eslint/no-this-alias': 'error',
                '@typescript-eslint/no-unused-vars': 'error',
                '@typescript-eslint/quotes': [
                    'error',
                    'single',
                ],
                '@typescript-eslint/semi': [
                    'error',
                    'always',
                ],
                '@typescript-eslint/type-annotation-spacing': 'error',
                '@typescript-eslint/typedef': [
                    'error',
                    {
                        arrayDestructuring: false,
                        arrowParameter: false,
                        memberVariableDeclaration: true,
                        objectDestructuring: false,
                        parameter: true,
                        propertyDeclaration: true,
                        variableDeclaration: false,
                    },
                ],
                '@typescript-eslint/unified-signatures': 'error',
                'header/header': [
                    2,
                    'line',
                    [
                        ' (C) Copyright 2015 Moodle Pty Ltd.',
                        '',
                        ' Licensed under the Apache License, Version 2.0 (the "License");',
                        ' you may not use this file except in compliance with the License.',
                        ' You may obtain a copy of the License at',
                        '',
                        '     http://www.apache.org/licenses/LICENSE-2.0',
                        '',
                        ' Unless required by applicable law or agreed to in writing, software',
                        ' distributed under the License is distributed on an "AS IS" BASIS,',
                        ' WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
                        ' See the License for the specific language governing permissions and',
                        ' limitations under the License.',
                    ],
                    1,
                ],
                'arrow-body-style': ['error', 'as-needed'],
                'array-bracket-spacing': ['error', 'never'],
                'comma-dangle': ['error', 'always-multiline'],
                'constructor-super': 'error',
                'curly': 'error',
                'default-case': 'error',
                'eol-last': 'error',
                'id-blacklist': [
                    'error',
                    'any',
                    'Number',
                    'number',
                    'String',
                    'string',
                    'Boolean',
                    'boolean',
                    'Undefined',
                    'undefined',
                ],
                'id-match': 'error',
                'jsdoc/check-alignment': 'error',
                'jsdoc/check-indentation': 'error',
                'jsdoc/newline-after-description': 'error',
                'linebreak-style': [
                    'error',
                    'unix',
                ],
                'max-len': [
                    'error',
                    {
                        code: 132,
                    },
                ],
                'new-parens': 'error',
                'no-bitwise': 'error',
                'no-cond-assign': 'error',
                'no-console': 'error',
                'no-debugger': 'error',
                'no-duplicate-case': 'error',
                'no-duplicate-imports': 'error',
                'no-empty': 'error',
                'no-eval': 'error',
                'no-invalid-this': 'error',
                'no-irregular-whitespace': 'error',
                'no-multiple-empty-lines': 'error',
                'no-new-wrappers': 'error',
                'no-redeclare': 'error',
                'no-sequences': 'error',
                'no-trailing-spaces': 'error',
                'no-underscore-dangle': 'error',
                'no-unused-labels': 'error',
                'no-var': 'error',
                'object-curly-spacing': ['error', 'always'],
                'one-var': ['error', 'never'],
                'padded-blocks': [
                    'error',
                    {
                        classes: 'always',
                        blocks: 'never',
                        switches: 'never',
                    },
                ],
                'padding-line-between-statements': [
                    'error',
                    {
                        blankLine: 'always',
                        prev: '*',
                        next: 'return',
                    },
                ],
                'prefer-arrow/prefer-arrow-functions': [
                    'error',
                    {
                        singleReturnOnly: true,
                        allowStandaloneDeclarations: true,
                    },
                ],
                'prefer-const': 'error',
                'prefer-spread': 'off',
                'quote-props': [
                    'error',
                    'consistent-as-needed',
                ],
                'spaced-comment': [
                    'error',
                    'always',
                    {
                        markers: [
                            '/',
                        ],
                    },
                ],
                'use-isnan': 'error',
                'yoda': 'error',
            },
        },
        {
            files: ['*.html'],
            extends: ['plugin:@angular-eslint/template/recommended'],
            rules: {
                'max-len': ['error', { code: 140 }],
            },
        },
        {
            files: ['*.component.ts'],
            extends: ['plugin:@angular-eslint/template/process-inline-templates'],
        },
    ],
};
