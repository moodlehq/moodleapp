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
import { APP_INITIALIZER, NgModule, Type } from '@angular/core';
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
import { AddonModGlossaryComponentsModule } from './components/components.module';
import { SITE_SCHEMA, OFFLINE_SITE_SCHEMA } from './services/database/glossary';
import { AddonModGlossaryProvider } from './services/glossary';
import { AddonModGlossaryEditLinkHandler } from './services/handlers/edit-link';
import { AddonModGlossaryEntryLinkHandler } from './services/handlers/entry-link';
import { AddonModGlossaryIndexLinkHandler } from './services/handlers/index-link';
import { AddonModGlossaryListLinkHandler } from './services/handlers/list-link';
import { AddonModGlossaryModuleHandler, AddonModGlossaryModuleHandlerService } from './services/handlers/module';
import { AddonModGlossaryPrefetchHandler } from './services/handlers/prefetch';
import { AddonModGlossarySyncCronHandler } from './services/handlers/sync-cron';
import { AddonModGlossaryTagAreaHandler } from './services/handlers/tag-area';

/**
 * Get mod Glossary services.
 *
 * @returns Returns mod Glossary services.
 */
export async function getModGlossaryServices(): Promise<Type<unknown>[]> {
    const { AddonModGlossaryProvider } = await import('@addons/mod/glossary/services/glossary');
    const { AddonModGlossaryOfflineProvider } = await import('@addons/mod/glossary/services/glossary-offline');
    const { AddonModGlossarySyncProvider } = await import('@addons/mod/glossary/services/glossary-sync');
    const { AddonModGlossaryHelperProvider } = await import('@addons/mod/glossary/services/glossary-helper');

    return [
        AddonModGlossaryProvider,
        AddonModGlossaryOfflineProvider,
        AddonModGlossarySyncProvider,
        AddonModGlossaryHelperProvider,
    ];
}

const mainMenuRoutes: Routes = [
    // Link handlers navigation.
    {
        path: `${AddonModGlossaryModuleHandlerService.PAGE_NAME}/entry/:entrySlug`,
        loadChildren: () => import('./glossary-entry-lazy.module').then(m => m.AddonModGlossaryEntryLazyModule),
    },

    // Course activity navigation.
    {
        path: AddonModGlossaryModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./glossary-lazy.module').then(m => m.AddonModGlossaryLazyModule),
    },

    // Single Activity format navigation.
    {
        path: `${COURSE_CONTENTS_PATH}/${AddonModGlossaryModuleHandlerService.PAGE_NAME}/entry/new`,
        loadChildren: () => import('./glossary-edit-lazy.module').then(m => m.AddonModGlossaryEditLazyModule),
        data: { glossaryPathPrefix: `${AddonModGlossaryModuleHandlerService.PAGE_NAME}/` },
    },
    {
        path: `${COURSE_CONTENTS_PATH}/${AddonModGlossaryModuleHandlerService.PAGE_NAME}/entry/:entrySlug/edit`,
        loadChildren: () => import('./glossary-edit-lazy.module').then(m => m.AddonModGlossaryEditLazyModule),
        data: { glossaryPathPrefix: `${AddonModGlossaryModuleHandlerService.PAGE_NAME}/` },
    },
    ...conditionalRoutes(
        [{
            path: `${COURSE_CONTENTS_PATH}/${AddonModGlossaryModuleHandlerService.PAGE_NAME}/entry/:entrySlug`,
            loadChildren: () => import('./glossary-entry-lazy.module').then(m => m.AddonModGlossaryEntryLazyModule),
            data: { glossaryPathPrefix: `${AddonModGlossaryModuleHandlerService.PAGE_NAME}/` },
        }],
        () => CoreScreen.isMobile,
    ),
];

// Single Activity format navigation.
const courseContentsRoutes: Routes = conditionalRoutes(
    [{
        path: `${AddonModGlossaryModuleHandlerService.PAGE_NAME}/entry/:entrySlug`,
        loadChildren: () => import('./glossary-entry-lazy.module').then(m => m.AddonModGlossaryEntryLazyModule),
        data: { glossaryPathPrefix: `${AddonModGlossaryModuleHandlerService.PAGE_NAME}/` },
    }],
    () => CoreScreen.isTablet,
);

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(mainMenuRoutes),
        CoreCourseContentsRoutingModule.forChild({ children: courseContentsRoutes }),
        AddonModGlossaryComponentsModule,
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

                CoreCourseHelper.registerModuleReminderClick(AddonModGlossaryProvider.COMPONENT);
            },
        },
    ],
})
export class AddonModGlossaryModule {}
