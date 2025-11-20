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

import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreMainMenuHomeRoutingModule } from '@features/mainmenu/mainmenu-home-routing.module';
import { CoreSitePreferencesRoutingModule } from '@features/settings/settings-site-routing.module';
import { canLeaveGuard } from '@guards/can-leave';
import { CORE_SITE_PLUGINS_PATH } from './constants';

/**
 * Get site plugins directives modules.
 *
 * @returns Site plugins exported directives.
 */
export async function getSitePluginsExportedDirectives(): Promise<unknown[]> {
    const { CoreSitePluginsCallWSDirective } = await import('./directives/call-ws');
    const { CoreSitePluginsCallWSNewContentDirective } = await import('./directives/call-ws-new-content');
    const { CoreSitePluginsCallWSOnLoadDirective } = await import('./directives/call-ws-on-load');
    const { CoreSitePluginsNewContentDirective } = await import('./directives/new-content');

    return [
        CoreSitePluginsCallWSDirective,
        CoreSitePluginsCallWSNewContentDirective,
        CoreSitePluginsCallWSOnLoadDirective,
        CoreSitePluginsNewContentDirective,
    ];
}

/**
 * Get shared files services.
 *
 * @returns Returns shared files services.
 */
export async function getSitePluginsServices(): Promise<Type<unknown>[]> {
    const { CoreSitePluginsProvider } = await import('@features/siteplugins/services/siteplugins');

    return [
        CoreSitePluginsProvider,
    ];
}

/**
 * Get site plugins exported objects.
 *
 * @returns Site plugins exported objects.
 */
export async function getSitePluginsExportedObjects(): Promise<Record<string, unknown>> {
    const { CoreSitePluginsModuleIndexComponent } = await import ('@features/siteplugins/components/module-index/module-index');
    const { CoreSitePluginsBlockComponent } = await import ('@features/siteplugins/components/block/block');
    const { CoreSitePluginsCourseFormatComponent } = await import ('@features/siteplugins/components/course-format/course-format');
    const { CoreSitePluginsQuestionComponent } = await import ('@features/siteplugins/components/question/question');
    const { CoreSitePluginsQuestionBehaviourComponent }
        = await import ('@features/siteplugins/components/question-behaviour/question-behaviour');
    const { CoreSitePluginsUserProfileFieldComponent }
        = await import ('@features/siteplugins/components/user-profile-field/user-profile-field');
    const { CoreSitePluginsQuizAccessRuleComponent }
        = await import ('@features/siteplugins/components/quiz-access-rule/quiz-access-rule');
    const { CoreSitePluginsAssignFeedbackComponent }
        = await import ('@features/siteplugins/components/assign-feedback/assign-feedback');
    const { CoreSitePluginsAssignSubmissionComponent }
        = await import ('@features/siteplugins/components/assign-submission/assign-submission');

    /* eslint-disable @typescript-eslint/naming-convention */
    return {
        CoreSitePluginsModuleIndexComponent,
        CoreSitePluginsBlockComponent,
        CoreSitePluginsCourseFormatComponent,
        CoreSitePluginsQuestionComponent,
        CoreSitePluginsQuestionBehaviourComponent,
        CoreSitePluginsUserProfileFieldComponent,
        CoreSitePluginsQuizAccessRuleComponent,
        CoreSitePluginsAssignFeedbackComponent,
        CoreSitePluginsAssignSubmissionComponent,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}

const routes: Routes = [
    {
        path: `${CORE_SITE_PLUGINS_PATH}/content/:component/:method/:hash`,
        loadComponent: () => import('@features/siteplugins/pages/plugin/plugin'),
        canDeactivate: [canLeaveGuard],
    },
];

const homeRoutes: Routes = [
    {
        path: `${CORE_SITE_PLUGINS_PATH}/homecontent/:component/:method`,
        loadComponent: () => import('@features/siteplugins/pages/plugin/plugin'),
        canDeactivate: [canLeaveGuard],
    },
];

const courseIndexRoutes: Routes = [
    {
        path: `${CORE_SITE_PLUGINS_PATH}/:handlerUniqueName`,
        loadComponent: () => import('@features/siteplugins/pages/course-option/course-option'),
        canDeactivate: [canLeaveGuard],
    },
];

const moduleRoutes: Routes = [
    {
        path: `${CORE_SITE_PLUGINS_PATH}/module/:courseId/:cmId`,
        loadComponent: () => import('@features/siteplugins/pages/module-index/module-index'),
        canDeactivate: [canLeaveGuard],
        data: { checkForcedLanguage: 'module' },
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(moduleRoutes.concat(routes)),
        CoreCourseIndexRoutingModule.forChild({ children: courseIndexRoutes }),
        CoreMainMenuHomeRoutingModule.forChild({ children: homeRoutes }),
        CoreSitePreferencesRoutingModule.forChild(routes),
    ],
    providers: [
        provideAppInitializer(async () => {
            const { CoreSitePluginsInit } = await import('./services/siteplugins-init');

            CoreSitePluginsInit.init();
        }),
    ],
})
export class CoreSitePluginsModule {}
