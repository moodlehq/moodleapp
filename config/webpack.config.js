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

const webpack = require('webpack');
const { getConfig, getBuild } = require('./utils');
const { resolve } = require('path');

module.exports = config => {
    config.resolve.alias['@'] = resolve('src');
    config.resolve.alias['@classes'] = resolve('src/core/classes');
    config.resolve.alias['@components'] = resolve('src/core/components');
    config.resolve.alias['@directives'] = resolve('src/core/directives');
    config.resolve.alias['@features'] = resolve('src/core/features');
    config.resolve.alias['@guards'] = resolve('src/core/guards');
    config.resolve.alias['@pipes'] = resolve('src/core/pipes');
    config.resolve.alias['@services'] = resolve('src/core/services');
    config.resolve.alias['@singletons'] = resolve('src/core/singletons');

    config.plugins.push(
        new webpack.DefinePlugin({
            'window.MoodleApp': {
                CONFIG: JSON.stringify(getConfig(process.env.NODE_ENV || 'development')),
                BUILD: JSON.stringify(getBuild(process.env.NODE_ENV || 'development')),
            },
        }),
    );

    return config;
};
