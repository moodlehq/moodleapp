const appConfig = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    plugins: [
        '@angular-eslint',
        '@typescript-eslint',
        'header',
        'jsdoc',
        'prefer-arrow',
        'promise',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates',
        'plugin:promise/recommended',
        'plugin:jsdoc/recommended',
        'plugin:deprecation/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module',
    },
    reportUnusedDisableDirectives: true,
    rules: {
        '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component', 'Page'] }],
        '@angular-eslint/no-output-on-prefix': 'off',
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
                    Function: false,
                },
            },
        ],
        '@typescript-eslint/explicit-member-accessibility': [
            'error',
            {
                accessibility: 'no-public',
            },
        ],
        '@typescript-eslint/explicit-module-boundary-types': [
            'error',
            {
                allowArgumentsExplicitlyTypedAsAny: true,
            },
        ],
        '@typescript-eslint/lines-between-class-members': [
            'error',
            'always',
            {
                exceptAfterSingleLine: true,
            },
        ],
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
        '@typescript-eslint/member-ordering': 'off',
        '@typescript-eslint/naming-convention': [
            'error',
            {
                selector: [
                    'classProperty',
                    'objectLiteralProperty',
                    'typeProperty',
                    'classMethod',
                    'objectLiteralMethod',
                    'typeMethod',
                    'accessor',
                    'enumMember'
                ],
                modifiers: ['requiresQuotes'],
                format: null,
            },
            {
                selector: 'property',
                format: ['camelCase'],
            },
            {
                selector: 'property',
                modifiers: ['public', 'readonly'],
                format: ['UPPER_CASE'],
            },
            {
                selector: 'property',
                modifiers: ['protected', 'readonly'],
                format: ['UPPER_CASE'],
            },
            {
                selector: 'property',
                modifiers: ['private', 'readonly'],
                format: ['UPPER_CASE'],
            },
            {
                selector: 'property',
                modifiers: ['private'],
                format: ['camelCase'],
                leadingUnderscore: 'allow',
            },
        ],
        '@typescript-eslint/no-empty-function': 'error',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-inferrable-types': [
            'error',
            {
                ignoreParameters: true,
            },
        ],
        '@typescript-eslint/no-non-null-assertion': 'warn',
        '@typescript-eslint/no-redeclare': 'error',
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
        'promise/catch-or-return': [
            'warn',
            {
                allowFinally: true,
                terminationMethod: ['catch', 'finally'],
            },
        ],
        'arrow-body-style': ['error', 'as-needed'],
        'array-bracket-spacing': ['error', 'never'],
        'comma-dangle': ['error', 'always-multiline'],
        'constructor-super': 'error',
        'curly': 'error',
        'eol-last': 'error',
        'function-call-argument-newline': ['error', 'consistent'],
        'function-paren-newline': ['error', 'multiline-arguments'],
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
        'jsdoc/check-param-names': [
            'error',
            {
                checkDestructured: false,
                enableFixer: true
            },
        ],
        'jsdoc/check-tag-names': [
            'warn',
            {
                'definedTags': ['deprecatedonmoodle']
            },
        ],
        'jsdoc/check-values': 'off',
        'jsdoc/require-param-type': 'off',
        'jsdoc/require-param': 'off',
        'jsdoc/require-returns-type': 'off',
        'jsdoc/tag-lines': [
            'error',
            'any',
            {
                startLines: 1,
            },
        ],
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
        'no-fallthrough': 'off',
        'no-invalid-this': 'error',
        'no-irregular-whitespace': 'error',
        'no-multiple-empty-lines': ['error', { max: 1 }],
        'no-new-wrappers': 'error',
        'no-restricted-imports': ['error', {
            'name': 'dayjs',
            'message': 'Please use the dayjs wrapper from @/core/utils/dayjs instead.',
        }],
        'no-sequences': 'error',
        'no-trailing-spaces': 'error',
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
            {
                blankLine: 'always',
                prev: '*',
                next: 'function',
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
};

var testsConfig = Object.assign({}, appConfig);
testsConfig['rules']['padded-blocks'] = [
    'error',
    {
        classes: 'always',
        switches: 'never',
    },
];
testsConfig['rules']['jest/expect-expect'] = 'off';
testsConfig['rules']['jest/no-done-callback'] = 'off';
testsConfig['plugins'].push('jest');
testsConfig['extends'].push('plugin:jest/recommended');

module.exports = {
    root: true,
    overrides: [
        Object.assign({ files: ['*.ts'] }, appConfig),
        Object.assign({ files: ['*.test.ts'] }, testsConfig),
        {
            files: ['*.html'],
            extends: ['plugin:@angular-eslint/template/recommended'],
            rules: {
                '@angular-eslint/template/alt-text': 'error',
                '@angular-eslint/template/elements-content': 'error',
                '@angular-eslint/template/label-has-associated-control': 'error',
                '@angular-eslint/template/no-duplicate-attributes': 'error',
                '@angular-eslint/template/no-positive-tabindex': 'error',
                '@angular-eslint/template/prefer-self-closing-tags': 'error',
                '@angular-eslint/template/table-scope': 'error',
                '@angular-eslint/template/valid-aria': 'error',
                'max-len': ['warn', { code: 140 }],
            },
        },
        {
            files: ['*.component.ts'],
            extends: ['plugin:@angular-eslint/template/process-inline-templates'],
        },
    ],
};
