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

import { APP_INITIALIZER, NgModule } from '@angular/core';
import { Routes } from '@angular/router';

import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CORE_SITE_SCHEMAS } from '@services/sites';
import { AddonModQuizComponentsModule } from './components/components.module';
import { SITE_SCHEMA } from './services/database/quiz';
import { AddonModQuizModuleHandler, AddonModQuizModuleHandlerService } from './services/handlers/module';
import { AddonModQuizPrefetchHandler } from './services/handlers/prefetch';

const routes: Routes = [
    {
        path: AddonModQuizModuleHandlerService.PAGE_NAME,
        loadChildren: () => import('./quiz-lazy.module').then(m => m.AddonModQuizLazyModule),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        AddonModQuizComponentsModule,
    ],
    providers: [
        {
            provide: CORE_SITE_SCHEMAS,
            useValue: [SITE_SCHEMA],
            multi: true,
        },
        {
            provide: APP_INITIALIZER,
            multi: true,
            deps: [],
            useFactory: () => () => {
                CoreCourseModuleDelegate.instance.registerHandler(AddonModQuizModuleHandler.instance);
                CoreCourseModulePrefetchDelegate.instance.registerHandler(AddonModQuizPrefetchHandler.instance);
            },
        },
    ],
})
export class AddonModQuizModule {}
