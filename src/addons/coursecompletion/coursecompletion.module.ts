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
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreCourseIndexRoutingModule } from '@features/course/course-routing.module';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreMainMenuTabRoutingModule } from '@features/mainmenu/mainmenu-tab-routing.module';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { AddonCourseCompletionStatusLinkHandler } from './services/handlers/completionstatus-link';
import { AddonCourseCompletionCourseOptionHandler } from './services/handlers/course-option';
import { AddonCourseCompletionUserHandler } from './services/handlers/user';

/**
 * Get course completion services.
 *
 * @returns Course completion services.
 */
export async function getCourseCompletionServices(): Promise<Type<unknown>[]> {
    const { AddonCourseCompletionProvider } = await import('@addons/coursecompletion/services/coursecompletion');

    return [
        AddonCourseCompletionProvider,
    ];
}

const routes: Routes = [
    {
        path: 'coursecompletion',
        loadChildren: () => import('./coursecompletion-lazy.module'),
    },
];

@NgModule({
    imports: [
        CoreMainMenuTabRoutingModule.forChild(routes),
        CoreCourseIndexRoutingModule.forChild({ children: routes }),
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                CoreUserDelegate.registerHandler(AddonCourseCompletionUserHandler.instance);
                CoreCourseOptionsDelegate.registerHandler(AddonCourseCompletionCourseOptionHandler.instance);
                CoreContentLinksDelegate.registerHandler(AddonCourseCompletionStatusLinkHandler.instance);
            },
        },
    ],
})
export class AddonCourseCompletionModule {}
