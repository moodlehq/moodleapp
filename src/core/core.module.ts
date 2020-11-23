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

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Injector, NgModule } from '@angular/core';

import { Platform } from '@ionic/angular';

import { CoreFeaturesModule } from './features/features.module';
import { CoreFile } from './services/file';
import { CoreInit, CoreInitDelegate } from './services/init';
import { CoreInterceptor } from './classes/interceptor';
import { CoreSites, CORE_SITE_SCHEMAS } from './services/sites';
import { CoreUpdateManager } from './services/update-manager';
import { setSingletonsInjector } from './singletons/core.singletons';
import { SITE_SCHEMA as FILEPOOL_SITE_SCHEMA } from './services/filepool-db';
import { SITE_SCHEMA as SITES_SITE_SCHEMA } from './services/sites-db';
import { SITE_SCHEMA as SYNC_SITE_SCHEMA } from './services/sync-db';

@NgModule({
    imports: [
        CoreFeaturesModule,
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: CoreInterceptor, multi: true },
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [
                FILEPOOL_SITE_SCHEMA,
                SITES_SITE_SCHEMA,
                SYNC_SITE_SCHEMA,
            ],
            multi: true,
        },
    ],
})
export class CoreModule {

    constructor(platform: Platform, injector: Injector) {
        // Set the injector.
        setSingletonsInjector(injector);

        // Register a handler for platform ready.
        CoreInit.instance.registerProcess({
            name: 'CorePlatformReady',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 400,
            blocking: true,
            load: async () => {
                await platform.ready();
            },
        });

        // Register the update manager as an init process.
        CoreInit.instance.registerProcess(CoreUpdateManager.instance);

        // Restore the user's session during the init process.
        CoreInit.instance.registerProcess({
            name: 'CoreRestoreSession',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 200,
            blocking: false,
            load: CoreSites.instance.restoreSession.bind(CoreSites.instance),
        });

        // Register clear app tmp folder.
        CoreInit.instance.registerProcess({
            name: 'CoreClearTmpFolder',
            priority: CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 150,
            blocking: false,
            load: CoreFile.instance.clearTmpFolder.bind(CoreFile.instance),
        });

        // Execute the init processes.
        CoreInit.instance.executeInitProcesses();
    }

}
