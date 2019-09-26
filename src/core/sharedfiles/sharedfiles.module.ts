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
import { Platform } from 'ionic-angular';
import { CoreSharedFilesProvider } from './providers/sharedfiles';
import { CoreSharedFilesHelperProvider } from './providers/helper';
import { CoreSharedFilesUploadHandler } from './providers/upload-handler';
import { CoreFileUploaderDelegate } from '@core/fileuploader/providers/delegate';
import { CoreEventsProvider } from '@providers/events';

// List of providers (without handlers).
export const CORE_SHAREDFILES_PROVIDERS: any[] = [
    CoreSharedFilesProvider,
    CoreSharedFilesHelperProvider
];

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        CoreSharedFilesProvider,
        CoreSharedFilesHelperProvider,
        CoreSharedFilesUploadHandler
    ]
})
export class CoreSharedFilesModule {
    constructor(platform: Platform, delegate: CoreFileUploaderDelegate, handler: CoreSharedFilesUploadHandler,
            helper: CoreSharedFilesHelperProvider, eventsProvider: CoreEventsProvider) {
        // Register the handler.
        delegate.registerHandler(handler);

        if (platform.is('ios')) {
            let lastCheck = 0;

            // Check if there are new files at app start and when the app is resumed.
            helper.searchIOSNewSharedFiles();
            platform.resume.subscribe(() => {
                // Wait a bit to make sure that APP_LAUNCHED_URL is treated before this callback.
                setTimeout(() => {
                    if (Date.now() - lastCheck < 1000) {
                        // Last check less than 1s ago, don't do anything.
                        return;
                    }

                    lastCheck = Date.now();
                    helper.searchIOSNewSharedFiles();
                }, 200);
            });

            eventsProvider.on(CoreEventsProvider.APP_LAUNCHED_URL, (url) => {
                if (url && url.indexOf('file://') === 0) {
                    // We received a file in iOS, it's probably a shared file. Treat it.
                    lastCheck = Date.now();
                    helper.searchIOSNewSharedFiles(url);
                }
            });
        }
    }
}
