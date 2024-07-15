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

import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
import { CoreCronDelegate } from '@services/cron';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonNotesCourseOptionHandler } from './services/handlers/course-option';
import { AddonNotesSyncCronHandler } from './services/handlers/sync-cron';
import { AddonNotesUserHandler } from './services/handlers/user';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { NOTES_OFFLINE_SITE_SCHEMA } from './services/database/notes';
import { Routes } from '@angular/router';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';

/**
 * Get notes services.
 *
 * @returns Returns notes services.
 */
export async function getNotesServices(): Promise<Type<unknown>[]> {
    const { AddonNotesProvider } = await import('@addons/notes/services/notes');
    const { AddonNotesOfflineProvider } = await import('@addons/notes/services/notes-offline');
    const { AddonNotesSyncProvider } = await import('@addons/notes/services/notes-sync');

    return [
        AddonNotesProvider,
        AddonNotesOfflineProvider,
        AddonNotesSyncProvider,
    ];
}

const routes: Routes = [
    {
        path: 'notes',
        loadChildren: () => import('@addons/notes/notes-lazy.module').then(m => m.AddonNotesLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreCourseIndexRoutingModule.forChild({ children: routes }),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [NOTES_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreUserDelegate.registerHandler(AddonNotesUserHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(AddonNotesCourseOptionHandler.instance);
                CoreCronDelegate.register(AddonNotesSyncCronHandler.instance);
            },
        },
    ],
})
export class AddonNotesModule {}
