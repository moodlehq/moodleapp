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

// Assets to copy.
const ASSETS = {
    '/node_modules/mathjax/es5/tex-mml-chtml.js': '/lib/mathjax/tex-mml-chtml.js',
    '/node_modules/mathjax/es5/input/mml/extensions': '/lib/mathjax/input/mml/extensions',
    '/node_modules/mathjax/es5/input/tex/extensions': '/lib/mathjax/input/tex/extensions',
    '/node_modules/mathjax/es5/output/chtml/fonts/woff-v2': '/lib/mathjax/output/chtml/fonts/woff-v2',
    '/node_modules/mathjax/es5/ui/safe.js': '/lib/mathjax/ui/safe.js',
    '/node_modules/mp3-mediarecorder/dist/vmsg.wasm': '/lib/vmsg/vmsg.wasm',
    '/src/core/features/h5p/assets': '/lib/h5p',
    '/node_modules/ogv/dist': '/lib/ogv',
    '/node_modules/video.js/dist/video-js.min.css': '/lib/video.js/video-js.min.css',
    '/node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3.wasm': '/lib/sqlite3/sqlite3.wasm',
    '/node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-opfs-async-proxy.js': '/lib/sqlite3/sqlite3-opfs-async-proxy.js',
};

module.exports = function(ctx) {
    const assetsPath = ctx.project.srcDir + '/assets';

    for (const src in ASSETS) {
        fse.copySync(ctx.project.dir + src, assetsPath + ASSETS[src], { overwrite: true });
    }
};
