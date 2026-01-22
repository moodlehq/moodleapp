import { defineConfig } from 'eslint/config';
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

import header from 'eslint-plugin-header';
import jsdoc from 'eslint-plugin-jsdoc';
import preferArrow from 'eslint-plugin-prefer-arrow';
import promise from 'eslint-plugin-promise';
import parser from '@typescript-eslint/parser';
import jest from 'eslint-plugin-jest';
import stylistic from '@stylistic/eslint-plugin';

import globals from 'globals';

header.rules.header.meta.schema = false;

const appConfig = {
    plugins: {
        angular,
        eslint,
        tseslint,
        header,
        jsdoc,
        'prefer-arrow': preferArrow,
        promise,
        '@stylistic': stylistic,
    },
    extends: [
        eslint.configs.recommended,
        ...tseslint.configs.recommended,
        ...angular.configs.tsRecommended,
        'promise/flat/recommended',
        'jsdoc/flat/recommended',
    ],
    // IMPORTANT: Set the custom processor to enable inline template linting
    // This allows your inline Component templates to be extracted and linted with the same
    // rules as your external .html template files
    processor: angular.processInlineTemplates,
    languageOptions: {
        parser,
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.es6,
        },
        parserOptions: {
            project: 'tsconfig.app.json', // Use tsconfig.app instead of tsconfig because it limits the files loaded by TS.
            sourceType: 'module',
        },
    },
    linterOptions: {
        reportUnusedDisableDirectives: true,
    },
    rules: {
        '@angular-eslint/component-class-suffix': ['error', { suffixes: ['Component', 'Page'] }],
        '@angular-eslint/no-output-on-prefix': 'off',
        '@angular-eslint/prefer-signals': [
            'error',
            {
                preferInputSignals: false, // @todo: Force input signals when all have been migrated.
                preferQuerySignals: false, // @todo: Force query signals when all have been migrated.
                preferReadonlySignalProperties: true,
            },
        ],
        '@typescript-eslint/adjacent-overload-signatures': 'error',
        '@typescript-eslint/no-restricted-types': [
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
        '@typescript-eslint/no-unused-expressions': [ // @todo: The default (recommended) behaviour is not allowing short circuit.
            'error',
            {
                allowShortCircuit: true,
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
        '@stylistic/lines-between-class-members': [
            'error',
            'always',
            {
                exceptAfterSingleLine: true,
            },
        ],
        '@stylistic/member-delimiter-style': [
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
                modifiers: ['public', 'static', 'readonly'],
                format: ['UPPER_CASE'],
            },
            {
                selector: 'property',
                modifiers: ['protected', 'static', 'readonly'],
                format: ['UPPER_CASE'],
            },
            {
                selector: 'property',
                modifiers: ['private', 'static', 'readonly'],
                format: ['UPPER_CASE'],
            },
            {
                selector: 'property',
                modifiers: ['private'],
                format: ['camelCase'],
                leadingUnderscore: 'allow',
            },
        ],
        '@typescript-eslint/no-deprecated': 'error',
        '@typescript-eslint/no-empty-function': 'error',
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
        '@stylistic/quotes': [
            'error',
            'single',
        ],
        '@stylistic/semi': [
            'error',
            'always',
        ],
        '@stylistic/type-annotation-spacing': 'error',
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
        '@stylistic/padded-blocks': [
            'error',
            {
                classes: 'always',
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

const cordovaPluginConfig = {
    ...appConfig,
    languageOptions: {
        ...appConfig.languageOptions,
        parserOptions: {
            ...appConfig.languageOptions.parserOptions,
            project: 'cordova-plugin-moodleapp/tsconfig.json', // Use the tsconfig of the cordova plugin.
        },
    },
};

const testsConfig = {
    ...appConfig,
    languageOptions: {
        ...appConfig.languageOptions,
        parserOptions: {
            ...appConfig.languageOptions.parserOptions,
            project: 'tsconfig.spec.json', // Use tsconfig.spec because it includes test files.
        },
    },
    rules: {
        ...appConfig.rules,
        'jest/expect-expect': 'off',
        'jest/no-done-callback': 'off',
    },
    plugins: {
        ...appConfig.plugins,
        jest,
    },
    extends: [
        ...appConfig.extends,
        'jest/flat/recommended',
    ],
};

export default defineConfig([
    Object.assign({
        files: ['src/**/*.ts'],
        ignores: [
            'src/**/tests/**',
            'src/**/stories/**',
            'src/testing/**',
            'src/**/*.test.ts',
            'src/**/*.stories.*'
        ],
    }, appConfig),
    Object.assign({ files: ['cordova-plugin-moodleapp/src/ts/**/*.ts'] }, cordovaPluginConfig),
    Object.assign({ files: ['src/**/*.test.ts'] }, testsConfig),
    {
        files: ['src/**/*.html'],
        extends: [...angular.configs.templateRecommended,],
        rules: {
            '@angular-eslint/template/alt-text': 'error',
            '@angular-eslint/template/elements-content': 'error',
            '@angular-eslint/template/label-has-associated-control': 'error',
            '@angular-eslint/template/no-duplicate-attributes': 'error',
            '@angular-eslint/template/no-positive-tabindex': 'error',
            '@angular-eslint/template/prefer-self-closing-tags': 'error',
            '@angular-eslint/template/table-scope': 'error',
            '@angular-eslint/template/valid-aria': 'error',
            '@angular-eslint/template/prefer-control-flow': 'warn',
            'max-len': ['warn', { code: 140 }],
        },
    },
    {
        ignores: ['**/*.js', '**/.*'],
    },
]);
