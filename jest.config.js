const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
    preset: 'jest-preset-angular',
    setupFilesAfterEnv: ['<rootDir>/src/testing/setup.ts'],
    testMatch: ['**/?(*.)test.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.test.ts',
        '!src/assets/**/*',
        '!src/testing/**/*',
        '!src/core/initializers/index.ts',
        '!src/core/features/emulators/services/zip.ts',
    ],
    transformIgnorePatterns: ['node_modules/(?!@stencil|@angular|@ionic|@moodlehq|@ngx-translate|@awesome-cordova-plugins|swiper|jest-preset-angular)'],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src/' }),
};
