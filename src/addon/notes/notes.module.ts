// (C) Copyright 2015 Martin Dougiamas
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
import { AddonNotesProvider } from './providers/notes';
import { AddonNotesOfflineProvider } from './providers/notes-offline';
import { AddonNotesSyncProvider } from './providers/notes-sync';
import { AddonNotesCourseOptionHandler } from './providers/course-option-handler';
import { AddonNotesSyncCronHandler } from './providers/sync-cron-handler';
import { AddonNotesUserHandler } from './providers/user-handler';
import { AddonNotesComponentsModule } from './components/components.module';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { CoreCronDelegate } from '@providers/cron';
import { CoreUserDelegate } from '@core/user/providers/user-delegate';
import { CoreUpdateManagerProvider } from '@providers/update-manager';

// List of providers (without handlers).
export const ADDON_NOTES_PROVIDERS: any[] = [
    AddonNotesProvider,
    AddonNotesOfflineProvider,
    AddonNotesSyncProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
        AddonNotesComponentsModule
    ],
    providers: [
        AddonNotesProvider,
        AddonNotesOfflineProvider,
        AddonNotesSyncProvider,
        AddonNotesCourseOptionHandler,
        AddonNotesSyncCronHandler,
        AddonNotesUserHandler    ]
})
export class AddonNotesModule {
    constructor(courseOptionsDelegate: CoreCourseOptionsDelegate, courseOptionHandler: AddonNotesCourseOptionHandler,
            userDelegate: CoreUserDelegate, userHandler: AddonNotesUserHandler,
            cronDelegate: CoreCronDelegate, syncHandler: AddonNotesSyncCronHandler, updateManager: CoreUpdateManagerProvider) {

        // Register handlers.
        courseOptionsDelegate.registerHandler(courseOptionHandler);
        userDelegate.registerHandler(userHandler);
        cronDelegate.register(syncHandler);

        // Allow migrating the tables from the old app to the new schema.
        updateManager.registerSiteTableMigration({
            name: 'mma_notes_offline_notes',
            newName: AddonNotesOfflineProvider.NOTES_TABLE
        });
    }
}
