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

import { NgModule, Type, provideAppInitializer } from '@angular/core';

import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { SITE_SCHEMA } from './services/database/h5p';
import { CoreH5PPluginFileHandler } from './services/handlers/pluginfile';

/**
 * Get H5P services.
 *
 * @returns Returns H5P services.
 */
export async function getH5PServices(): Promise<Type<unknown>[]> {
    const { CoreH5PProvider } = await import('@features/h5p/services/h5p');

    return [
        CoreH5PProvider,
    ];
}

@NgModule({
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(() => {
            CorePluginFileDelegate.registerHandler(CoreH5PPluginFileHandler.instance);
        }),
    ],
})
export class CoreH5PModule {}
