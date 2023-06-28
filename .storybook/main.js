module.exports = {
    framework: '@storybook/angular',
    addons: [
        '@storybook/addon-controls',
        '@storybook/addon-viewport',
        'storybook-addon-designs',
        'storybook-addon-rtl-direction',
        'storybook-dark-mode',
    ],
    stories: ['../src/**/*.stories.ts'],
}
