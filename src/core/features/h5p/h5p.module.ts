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

import { APP_INITIALIZER, NgModule } from '@angular/core';

import { CorePluginFileDelegate } from '@services/plugin-file-delegate';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import {
    CONTENT_TABLE_NAME,
    LIBRARIES_TABLE_NAME,
    LIBRARY_DEPENDENCIES_TABLE_NAME,
    CONTENTS_LIBRARIES_TABLE_NAME,
    LIBRARIES_CACHEDASSETS_TABLE_NAME,
} from './services/database/h5p';
import { CoreH5PPluginFileHandler } from './services/handlers/pluginfile';

@NgModule({
    imports: [
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [
                CONTENT_TABLE_NAME,
                LIBRARIES_TABLE_NAME,
                LIBRARY_DEPENDENCIES_TABLE_NAME,
                CONTENTS_LIBRARIES_TABLE_NAME,
                LIBRARIES_CACHEDASSETS_TABLE_NAME,
            ],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CorePluginFileDelegate.instance.registerHandler(CoreH5PPluginFileHandler.instance);
            },
        },
    ],
})
export class CoreH5PModule {}
