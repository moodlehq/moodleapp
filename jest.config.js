const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig');

module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
    testMatch: ['**/?(*.)test.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,html}',
        '!src/testing/**/*',
    ],
    transform: {
        '^.+\\.(ts|html)$': 'ts-jest',
    },
    transformIgnorePatterns: ['node_modules/(?!@ionic-native|@ionic|@moodlehq/ionic-native-push)'],
    moduleNameMapper: {
        ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src/' }),
        '^!raw-loader!.*': 'jest-raw-loader',
    },
    globals: {
        'ts-jest': {
            tsconfig: './tsconfig.test.json',
        },
    },
};
