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
import { CoreEventsProvider } from '@providers/events';
import { CoreCronDelegate } from '@providers/cron';
import { CoreCommentsProvider } from './providers/comments';
import { CoreCommentsOfflineProvider } from './providers/offline';
import { CoreCommentsSyncCronHandler } from './providers/sync-cron-handler';
import { CoreCommentsSyncProvider } from './providers/sync';

@NgModule({
    declarations: [
    ],
    imports: [
    ],
    providers: [
        CoreCommentsProvider,
        CoreCommentsOfflineProvider,
        CoreCommentsSyncProvider,
        CoreCommentsSyncCronHandler
    ]
})
export class CoreCommentsModule {
    constructor(eventsProvider: CoreEventsProvider, cronDelegate: CoreCronDelegate, syncHandler: CoreCommentsSyncCronHandler) {
        // Reset comments page size.
        eventsProvider.on(CoreEventsProvider.LOGIN, () => {
            CoreCommentsProvider.pageSize = 1;
            CoreCommentsProvider.pageSizeOK = false;
        });

        cronDelegate.register(syncHandler);
    }
}
