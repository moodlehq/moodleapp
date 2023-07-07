#!/usr/bin/env node

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

const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

function fixBundle() {
    const bundlePath = resolve(__dirname, '../www/index.js');
    const bundle = readFileSync(bundlePath).toString();

    writeFileSync(bundlePath, bundle.replace('window.cordovaModule', 'module.exports'));
}

const options = {
    entryPoints: [resolve(__dirname, '../src/ts/index.ts')],
    tsconfig: resolve(__dirname, '../tsconfig.json'),
    outdir: resolve(__dirname, '../www'),
    minify: process.env.NODE_ENV === 'production',
    bundle: true,
    plugins: [{
        name: 'moodleapp',
        setup(build) {
            build.onEnd(result => {
                if (result.errors.length > 0) {
                    console.error('cordova-plugin-moodleapp build failed! ', result.errors);

                    return;
                }

                fixBundle();
                console.log('cordova-plugin-moodleapp built');
            });
        },
    }],
};

if (process.argv.includes('--watch')) {
    require('esbuild').context(options).then(context => context.watch());
} else {
    require('esbuild').build(options);
}
