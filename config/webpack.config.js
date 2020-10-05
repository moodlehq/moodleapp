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

const { webpack } = require('webpack');
const { resolve } = require('path');

module.exports = (config, options, targetOptions) => {
    config.resolve.alias['@'] = resolve('src');
    config.resolve.alias['@addon'] = resolve('src/app/addon');
    config.resolve.alias['@app'] = resolve('src/app');
    config.resolve.alias['@classes'] = resolve('src/app/classes');
    config.resolve.alias['@components'] = resolve('src/app/components');
    config.resolve.alias['@core'] = resolve('src/app/core');
    config.resolve.alias['@directives'] = resolve('src/app/directives');
    config.resolve.alias['@pipes'] = resolve('src/app/pipes');
    config.resolve.alias['@services'] = resolve('src/app/services');
    config.resolve.alias['@singletons'] = resolve('src/app/singletons');

    return config;
};
