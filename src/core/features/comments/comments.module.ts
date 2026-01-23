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
import { Routes } from '@angular/router';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreCronDelegate } from '@services/cron';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreComments } from './services/comments';
import { COMMENTS_OFFLINE_SITE_SCHEMA } from './services/database/comments';
import { CoreCommentsSyncCronHandler } from './services/handlers/sync-cron';

/**
 * Get comments services.
 *
 * @returns Comments services.
 */
export async function getCommentsServices(): Promise<Type<unknown>[]> {
    const { CoreCommentsOfflineProvider } = await import('@features/comments/services/comments-offline');
    const { CoreCommentsSyncProvider } = await import('@features/comments/services/comments-sync');
    const { CoreCommentsProvider } = await import('@features/comments/services/comments');

    return [
        CoreCommentsOfflineProvider,
        CoreCommentsSyncProvider,
        CoreCommentsProvider,
    ];
}

const routes: Routes = [
    {
        path: 'comments/:contextLevel/:instanceId/:componentName/:itemId',
        loadComponent: () => import('@features/comments/pages/viewer/viewer'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [COMMENTS_OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(() => {
            CoreCronDelegate.register(CoreCommentsSyncCronHandler.instance);

            CoreComments.initialize();
        }),
    ],
})
export class CoreCommentsModule {}
