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
  },
  copyMathJaxMain: {
    src: ['{{ROOT}}/node_modules/mathjax/*.js'],
    dest: '{{WWW}}/lib/mathjax'
  },
  copyMathJaxConfig: {
    src: ['{{ROOT}}/node_modules/mathjax/config/**/*'],
    dest: '{{WWW}}/lib/mathjax/config'
  },
  copyMathJaxExtensions: {
    src: ['{{ROOT}}/node_modules/mathjax/extensions/**/*'],
    dest: '{{WWW}}/lib/mathjax/extensions'
  },
  copyMathJaxFonts: {
    src: ['{{ROOT}}/node_modules/mathjax/fonts/**/*'],
    dest: '{{WWW}}/lib/mathjax/fonts'
  },
  copyMathJaxJax: {
    src: ['{{ROOT}}/node_modules/mathjax/jax/**/*'],
    dest: '{{WWW}}/lib/mathjax/jax'
  },
  copyMathJaxLocalization: {
    src: ['{{ROOT}}/node_modules/mathjax/localization/**/*'],
    dest: '{{WWW}}/lib/mathjax/localization'
  },
};
