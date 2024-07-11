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

import { conditionalRoutes } from '@/app/app-routing.module';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { COURSE_CONTENTS_PATH } from '@features/course/course.module';
import { CoreCourseContentsRoutingModule } from '@features/course/course-contents-routing.module';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreTagAreaDelegate } from '@features/tag/services/tag-area-delegate';
import { CoreCronDelegate } from '@services/cron';
import { CoreScreen } from '@services/screen';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/database/glossary';
import { AddonModGlossaryEditLinkHandler } from './services/handlers/edit-link';
import { AddonModGlossaryEntryLinkHandler } from './services/handlers/entry-link';
import { AddonModGlossaryIndexLinkHandler } from './services/handlers/index-link';
import { AddonModGlossaryListLinkHandler } from './services/handlers/list-link';
import { AddonModGlossaryModuleHandler } from './services/handlers/module';
import { AddonModGlossaryPrefetchHandler } from './services/handlers/prefetch';
import { AddonModGlossarySyncCronHandler } from './services/handlers/sync-cron';
import { AddonModGlossaryTagAreaHandler } from './services/handlers/tag-area';
import { ADDON_MOD_GLOSSARY_COMPONENT, ADDON_MOD_GLOSSARY_PAGE_NAME } from './constants';

const mainMenuRoutes: Routes = [
    // Link handlers navigation.
    {
        path: `${ADDON_MOD_GLOSSARY_PAGE_NAME}/entry/:entrySlug`,
        loadChildren: () => import('./glossary-entry-lazy.module'),
    },

    // Course activity navigation.
    {
        path: ADDON_MOD_GLOSSARY_PAGE_NAME,
        loadChildren: () => import('./glossary-lazy.module'),
    },

    // Single Activity format navigation.
    {
        path: `${COURSE_CONTENTS_PATH}/${ADDON_MOD_GLOSSARY_PAGE_NAME}/entry/new`,
        loadChildren: () => import('./glossary-edit-lazy.module'),
        data: { glossaryPathPrefix: `${ADDON_MOD_GLOSSARY_PAGE_NAME}/` },
    },
    {
        path: `${COURSE_CONTENTS_PATH}/${ADDON_MOD_GLOSSARY_PAGE_NAME}/entry/:entrySlug/edit`,
        loadChildren: () => import('./glossary-edit-lazy.module'),
        data: { glossaryPathPrefix: `${ADDON_MOD_GLOSSARY_PAGE_NAME}/` },
    },
    ...conditionalRoutes(
        [{
            path: `${COURSE_CONTENTS_PATH}/${ADDON_MOD_GLOSSARY_PAGE_NAME}/entry/:entrySlug`,
            loadChildren: () => import('./glossary-entry-lazy.module'),
            data: { glossaryPathPrefix: `${ADDON_MOD_GLOSSARY_PAGE_NAME}/` },
        }],
        () => CoreScreen.isMobile,
    ),
];

// Single Activity format navigation.
const courseContentsRoutes: Routes = conditionalRoutes(
    [{
        path: `${ADDON_MOD_GLOSSARY_PAGE_NAME}/entry/:entrySlug`,
        loadChildren: () => import('./glossary-entry-lazy.module'),
        data: { glossaryPathPrefix: `${ADDON_MOD_GLOSSARY_PAGE_NAME}/` },
    }],
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
            useValue: [SITE_SCHEMA, OFFLINE_SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreCourseModuleDelegate.registerHandler(AddonModGlossaryModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.registerHandler(AddonModGlossaryPrefetchHandler.instance);
                CoreCronDelegate.register(AddonModGlossarySyncCronHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModGlossaryIndexLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModGlossaryListLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModGlossaryEditLinkHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonModGlossaryEntryLinkHandler.instance);
                CoreTagAreaDelegate.registerHandler(AddonModGlossaryTagAreaHandler.instance);

                CoreCourseHelper.registerModuleReminderClick(ADDON_MOD_GLOSSARY_COMPONENT);
            },
        },
    ],
})
export class AddonModGlossaryModule {}
