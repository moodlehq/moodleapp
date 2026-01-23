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

const TerserPlugin = require('terser-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const { appendFileSync } = require('fs');

module.exports = config => {
    // Set COEP/COOP headers for dev server to allow YouTube embeds
    config.devServer = config.devServer || {};
    config.devServer.headers = {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
    };

    config.optimization.minimizer.push(
        new TerserPlugin({
            terserOptions: {
                mangle: {
                    keep_classnames: true,
                    keep_fnames: true,
                },
                compress: {
                    toplevel: true,
                    pure_getters: true,
                    side_effects: false,
                },
                keep_classnames: true,
                keep_fnames: true,
            },
        }),
    );

    if (process.env.MOODLE_APP_COVERAGE) {
        const tsConfig = config.module.rules[2];

        config.module.rules.splice(2, 0, {
            ...tsConfig,
            exclude: /node_modules/,
            use: [
                '@jsdevtools/coverage-istanbul-loader',
                ...tsConfig.use,
            ],
        });
    }

    if (process.env.MOODLE_APP_CIRCULAR_DEPENDENCIES) {
        config.plugins.push(
            new CircularDependencyPlugin({
                exclude: /node_modules/,
                cwd: process.cwd(),
                onDetected({ paths }) {
                    appendFileSync(
                        `${process.cwd()}/circular-dependencies`,
                        paths.join(' -> ') + '\n',
                    );
                },
            }),
        );
    }

    return config;
};

module.exports.browserslist = 'browserslist';
