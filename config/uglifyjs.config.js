// Check https://github.com/mishoo/UglifyJS2/tree/harmony#minify-options-structure
module.exports = {
    /**
     * mangle: uglify 2's mangle option
     */
    mangle: {
      keep_classnames: true,
      keep_fnames: true
    },
    /**
     * compress: uglify 2's compress option
     */
    compress: {
      toplevel: true,
      pure_getters: true
    },
    keep_classnames: true,
    keep_fnames: true
}