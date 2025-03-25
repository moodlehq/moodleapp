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
import { Routes } from '@angular/router';

import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CORE_USER_OFFLINE_SITE_SCHEMA, CORE_USER_CACHE_SITE_SCHEMA } from './services/database/user';
import { CoreUserDelegate } from './services/user-delegate';
import { CoreUserProfileMailHandler } from './services/handlers/profile-mail';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreUserProfileLinkHandler } from './services/handlers/profile-link';
import { CoreCronDelegate } from '@services/cron';
import { CoreUserSyncCronHandler } from './services/handlers/sync-cron';
import { CoreUserTagAreaHandler } from './services/handlers/tag-area';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreUserCourseOptionHandler } from './services/handlers/course-option';
import { CoreUserHelper } from './services/user-helper';
import { AppRoutingModule, conditionalRoutes } from '@/app/app-routing.module';
import { CoreScreen } from '@services/screen';
import { CoreEvents } from '@singletons/events';
import { CORE_COURSE_PAGE_NAME, CORE_COURSE_INDEX_PATH } from '@features/course/constants';
import { PARTICIPANTS_PAGE_NAME } from './constants';

/**
 * Get user services.
 *
 * @returns Returns user services.
 */
export async function getUsersServices(): Promise<Type<unknown>[]> {
    const { CoreUserProvider } = await import('@features/user/services/user');
    const { CoreUserHelperProvider } = await import('@features/user/services/user-helper');
    const { CoreUserDelegateService } = await import('@features/user/services/user-delegate');
    const { CoreUserProfileFieldDelegateService } = await import('@features/user/services/user-profile-field-delegate');
    const { CoreUserOfflineProvider } = await import('@features/user/services/user-offline');
    const { CoreUserSyncProvider } = await import('@features/user/services/user-sync');

    return [
        CoreUserProvider,
        CoreUserHelperProvider,
        CoreUserDelegateService,
        CoreUserProfileFieldDelegateService,
        CoreUserOfflineProvider,
        CoreUserSyncProvider,
    ];
}

/**
 * Get directives and components for site plugins.
 *
 * @returns Returns directives and components.
 */
export async function getUsersExportedDirectives(): Promise<Type<unknown>[]> {
    const { CoreUserProfileFieldComponent } = await import('@features/user/components/user-profile-field/user-profile-field');

    return [
        CoreUserProfileFieldComponent,
    ];
}

const appRoutes: Routes = [
    {
        path: 'user/completeprofile',
        loadComponent: () => import('@features/user/pages/complete-profile/complete-profile'),
    },
];

const routes: Routes = [
    {
        path: 'user',
        loadChildren: () => [
            {
                path: '',
                redirectTo: 'profile',
                pathMatch: 'full',
            },
            {
                path: 'profile',
                loadComponent: () => import('@features/user/pages/profile/profile'),
            },
            {
                path: 'about',
                loadComponent: () => import('@features/user/pages/about/about'),
            },
        ],
    },
    ...conditionalRoutes([
        {
            path: `${CORE_COURSE_PAGE_NAME}/${CORE_COURSE_INDEX_PATH}/${PARTICIPANTS_PAGE_NAME}/:userId`,
            loadComponent: () => import('@features/user/pages/profile/profile'),
            data: {
                swipeManagerSource: 'participants',
            },
        },
    ], () => CoreScreen.isMobile),
];

const courseIndexRoutes: Routes = [
    {
        path: PARTICIPANTS_PAGE_NAME,
        loadComponent: () => import('@features/user/pages/participants/participants'),
        loadChildren: () => conditionalRoutes([
            {
                path: ':userId',
                loadComponent: () => import('@features/user/pages/profile/profile'),
                data: { swipeManagerSource: 'participants' },
            },
        ], () => CoreScreen.isTablet),
    },
];

@NgModule({
    imports: [
        AppRoutingModule.forChild(appRoutes),
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [
                CORE_USER_CACHE_SITE_SCHEMA,
                CORE_USER_OFFLINE_SITE_SCHEMA,
            ],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreUserDelegate.registerHandler(CoreUserProfileMailHandler.instance);
                CoreContentLinksDelegate.registerHandler(CoreUserProfileLinkHandler.instance);
                CoreCronDelegate.register(CoreUserSyncCronHandler.instance);
                CoreTagAreaDelegate.registerHandler(CoreUserTagAreaHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(CoreUserCourseOptionHandler.instance);

                CoreEvents.on(CoreEvents.USER_NOT_FULLY_SETUP, (data) => {
                    CoreUserHelper.openCompleteProfile(data.siteId);
                });
            },
        },
    ],
})
export class CoreUserModule {}
