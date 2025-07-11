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

import { EnvironmentProviders, provideAppInitializer } from '@angular/core';

/**
 * Get the providers for the initializers.
 * Please use the provideAppInitializer to provide the initializers.
 *
 * @returns List of providers.
 */
export function getInitializerProviders(): EnvironmentProviders[] {
    if (!import.meta.webpackContext) {
        return [];
    }

    const context = import.meta.webpackContext(
        './',
        {
            recursive: false,
            regExp: /\.\/.*\.ts$/,
        },
    );

    return context.keys().reduce((providers, fileName) => {
        const name = (fileName.match(/^(?:\.\/)?(.+)\.ts$/) || [])[1];

        if (name !== undefined && name !== 'index') {
            providers.push(provideAppInitializer(context(fileName).default));
        }

        return providers;
    }, [] as EnvironmentProviders[]);
}
