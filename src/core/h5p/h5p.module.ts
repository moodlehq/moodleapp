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

import { NgModule } from '@angular/core';
import { CoreH5PComponentsModule } from './components/components.module';
import { CoreH5P, CoreH5PProvider } from './providers/h5p';
import { CoreH5PPluginFileHandler } from './providers/pluginfile-handler';
import { CoreEventsProvider } from '@providers/events';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';

// List of providers (without handlers).
export const CORE_H5P_PROVIDERS: any[] = [
    CoreH5PProvider,
];

@NgModule({
    declarations: [],
    imports: [
        CoreH5PComponentsModule
    ],
    providers: [
        CoreH5PProvider,
        CoreH5PPluginFileHandler
    ],
    exports: []
})
export class CoreH5PModule {
    constructor(pluginfileDelegate: CorePluginFileDelegate,
            pluginfileHandler: CoreH5PPluginFileHandler,
            eventsProvider: CoreEventsProvider) {

        pluginfileDelegate.registerHandler(pluginfileHandler);

        // Delete content indexes if language changes, to update the strings.
        eventsProvider.on(CoreEventsProvider.LANGUAGE_CHANGED, () => {
            CoreH5P.instance.h5pPlayer.deleteAllContentIndexes();
        });
    }
}
