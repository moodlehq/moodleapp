// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Script to copy some files to the www folder.
 */
const fse = require('fs-extra');
const path = require('path');

// Assets to copy.
const ASSETS = {
    '/node_modules/mathjax/MathJax.js': '/lib/mathjax/MathJax.js',
    '/node_modules/mathjax/extensions': '/lib/mathjax/extensions',
    '/node_modules/mathjax/jax/element': '/lib/mathjax/jax/element',
    '/node_modules/mathjax/jax/input': '/lib/mathjax/jax/input',
    '/node_modules/mathjax/jax/output/SVG': '/lib/mathjax/jax/output/SVG',
    '/node_modules/mathjax/jax/output/PreviewHTML': '/lib/mathjax/jax/output/PreviewHTML',
    '/node_modules/mathjax/localization': '/lib/mathjax/localization',
    '/src/core/features/h5p/assets': '/lib/h5p',
};

module.exports = function(ctx) {
    const assetsPath = ctx.project.srcDir + '/assets';

    for (const src in ASSETS) {
        fse.copySync(ctx.project.dir + src, assetsPath + ASSETS[src], { overwrite: true });
    }
};
