// New copy task for font files and config.json.
module.exports = {
  // Override Ionic copyFonts task to exclude Roboto and Noto fonts.
  copyFonts: {
    src: ['{{ROOT}}/node_modules/ionicons/dist/fonts/**/*'],
    dest: '{{WWW}}/assets/fonts'
  },
  copyFontAwesome: {
    src: ['{{ROOT}}/node_modules/font-awesome/fonts/**/*'],
    dest: '{{WWW}}/assets/fonts'
  },
  copyConfig: {
    src: ['{{ROOT}}/src/config.json'],
    dest: '{{WWW}}/'
  }
};
