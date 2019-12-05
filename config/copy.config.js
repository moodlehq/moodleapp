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
    src: ['{{ROOT}}/node_modules/mathjax/MathJax.js'],
    dest: '{{WWW}}/lib/mathjax'
  },
  copyMathJaxExtensions: {
    src: ['{{ROOT}}/node_modules/mathjax/extensions/**/*'],
    dest: '{{WWW}}/lib/mathjax/extensions'
  },
  copyMathJaxElement: {
    src: ['{{ROOT}}/node_modules/mathjax/jax/element/**/*'],
    dest: '{{WWW}}/lib/mathjax/jax/element'
  },
  copyMathJaxInput: {
    src: ['{{ROOT}}/node_modules/mathjax/jax/input/**/*'],
    dest: '{{WWW}}/lib/mathjax/jax/input'
  },
  copyMathJaxOutput: {
    src: ['{{ROOT}}/node_modules/mathjax/jax/output/SVG/**/*'],
    dest: '{{WWW}}/lib/mathjax/jax/output/SVG'
  },
  copyMathJaxLocalization: {
    src: ['{{ROOT}}/node_modules/mathjax/localization/**/*'],
    dest: '{{WWW}}/lib/mathjax/localization'
  },
};
