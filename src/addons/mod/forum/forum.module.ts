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

import { NgModule, provideAppInitializer } from '@angular/core';
import { Route, Routes } from '@angular/router';

import { conditionalRoutes } from '@/app/app-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { CoreCourseContentsRoutingModule } from '@features/course/course-contents-routing.module';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreScreen } from '@services/screen';

import { AddonModForumModuleHandler } from './services/handlers/module';
import { SITE_SCHEMA } from './services/database/offline';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { AddonModForumPrefetchHandler } from './services/handlers/prefetch';
import { CoreCronDelegate } from '@services/cron';
import { AddonModForumSyncCronHandler } from './services/handlers/sync-cron';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { AddonModForumDiscussionLinkHandler } from './services/handlers/discussion-link';
import { AddonModForumIndexLinkHandler } from './services/handlers/index-link';
import { AddonModForumListLinkHandler } from './services/handlers/list-link';
import { AddonModForumPostLinkHandler } from './services/handlers/post-link';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { AddonModForumTagAreaHandler } from './services/handlers/tag-area';
import { CorePushNotificationsDelegate } from '@features/pushnotifications/services/push-delegate';
import { AddonModForumPushClickHandler } from './services/handlers/push-click';
import { CORE_COURSE_CONTENTS_PATH, CoreCourseForceLanguageSource } from '@features/course/constants';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { ADDON_MOD_FORUM_COMPONENT_LEGACY, ADDON_MOD_FORUM_PAGE_NAME, ADDON_MOD_FORUM_SEARCH_PAGE_NAME } from './constants';
import { canLeaveGuard } from '@guards/can-leave';

const newDiscussionRoute: Route = {
    loadComponent: () => import('./pages/new-discussion/new-discussion'),
    canDeactivate: [canLeaveGuard],
};

const discussionRoute: Route = {
    loadComponent: () => import('./pages/discussion/discussion'),
    canDeactivate: [canLeaveGuard],
};

const mobileRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        loadComponent: () => import('./pages/index/index'),
    },
    {
        path: ':courseId/:cmId/new/:timeCreated',
        ...newDiscussionRoute,
    },
    {
        path: ':courseId/:cmId/:discussionId',
        ...discussionRoute,

    },
    {
        path: 'discussion/:discussionId', // Only for discussion link handling.
        ...discussionRoute,
    },
];

const tabletRoutes: Routes = [
    {
        path: ':courseId/:cmId',
        loadComponent: () => import('./pages/index/index'),
        loadChildren: () => [
            {
                path: 'new/:timeCreated',
                ...newDiscussionRoute,
            },
            {
                path: ':discussionId',
                ...discussionRoute,
            },
        ],
    },
];

const mainMenuRoutes: Routes = [
    {
        path: ADDON_MOD_FORUM_SEARCH_PAGE_NAME,
        loadComponent: () => import('./pages/search/search'),
        data: { checkForcedLanguage: CoreCourseForceLanguageSource.COURSE },
    },
    {
        path: `${ADDON_MOD_FORUM_PAGE_NAME}/discussion/:discussionId`,
        data: { swipeEnabled: false },
        ...discussionRoute,
    },
    {
        path: ADDON_MOD_FORUM_PAGE_NAME,
        loadChildren: () => [
            ...conditionalRoutes(mobileRoutes, () => CoreScreen.isMobile),
            ...conditionalRoutes(tabletRoutes, () => CoreScreen.isTablet),
        ],
        data: { checkForcedLanguage: CoreCourseForceLanguageSource.MODULE },
    },
    ...conditionalRoutes(
        [
            {
                path: `${CORE_COURSE_CONTENTS_PATH}/${ADDON_MOD_FORUM_PAGE_NAME}/new/:timeCreated`,
                data: { discussionsPathPrefix: `${ADDON_MOD_FORUM_PAGE_NAME}/` },
                ...newDiscussionRoute,
            },
            {
                path: `${CORE_COURSE_CONTENTS_PATH}/${ADDON_MOD_FORUM_PAGE_NAME}/:discussionId`,
                data: { discussionsPathPrefix: `${ADDON_MOD_FORUM_PAGE_NAME}/` },
                ...discussionRoute,
            },
        ],
        () => CoreScreen.isMobile,
    ),
];

// Single Activity format navigation.
const courseContentsRoutes: Routes = conditionalRoutes(
    [
        {
            path: `${ADDON_MOD_FORUM_PAGE_NAME}/new/:timeCreated`,
            ...newDiscussionRoute,
            data: { discussionsPathPrefix: `${ADDON_MOD_FORUM_PAGE_NAME}/` },
        },
        {
            path: `${ADDON_MOD_FORUM_PAGE_NAME}/:discussionId`,
            data: { discussionsPathPrefix: `${ADDON_MOD_FORUM_PAGE_NAME}/` },
            ...discussionRoute,
        },
    ],
    () => CoreScreen.isTablet,
);

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuRoutes),
        CoreCourseContentsRoutingModule.forChild({ children: courseContentsRoutes }),
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA],
            multi: true,
        },
        provideAppInitializer(() => {
            CoreCourseModuleDelegate.registerHandler(AddonModForumModuleHandler.instance);
            CoreCourseModulePrefetchDelegate.registerHandler(AddonModForumPrefetchHandler.instance);
            CoreCronDelegate.register(AddonModForumSyncCronHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModForumDiscussionLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModForumIndexLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModForumListLinkHandler.instance);
            CoreContentLinksDelegate.registerHandler(AddonModForumPostLinkHandler.instance);
            CoreTagAreaDelegate.registerHandler(AddonModForumTagAreaHandler.instance);
            CorePushNotificationsDelegate.registerClickHandler(AddonModForumPushClickHandler.instance);

            CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_FORUM_COMPONENT_LEGACY);
        }),
    ],
})
export class AddonModForumModule {}
