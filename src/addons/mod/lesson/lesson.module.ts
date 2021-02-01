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

import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { AddonModLessonComponentsModule } from './components/components.module';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/database/lesson';
import { AddonModLessonPrefetchHandler } from './services/handlers/prefetch';
import { AddonModLessonSyncCronHandler } from './services/handlers/sync-cron';

@NgModule({
    imports: [
        AddonModLessonComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA, OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreCourseModulePrefetchDelegate.instance.registerHandler(AddonModLessonPrefetchHandler.instance);
                CoreCronDelegate.instance.register(AddonModLessonSyncCronHandler.instance);
            },
        },
    ],
})
export class AddonModLessonModule {}
