// (C) Copyright 2015 Martin Dougiamas
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
import { CoreGradesProvider } from './providers/grades';
import { CoreGradesHelperProvider } from './providers/helper';
import { CoreMainMenuDelegate } from '../mainmenu/providers/delegate';
import { CoreGradesMainMenuHandler } from './providers/mainmenu-handler';
import { CoreGradesCourseOptionHandler } from './providers/course-option-handler';
import { CoreGradesComponentsModule } from './components/components.module';
import { CoreCourseOptionsDelegate } from '../course/providers/options-delegate';

@NgModule({
    declarations: [
    ],
    imports: [
        CoreGradesComponentsModule
    ],
    providers: [
        CoreGradesProvider,
        CoreGradesHelperProvider,
        CoreGradesMainMenuHandler,
        CoreGradesCourseOptionHandler
    ]
})
export class CoreGradesModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, gradesMenuHandler: CoreGradesMainMenuHandler,
            courseOptionHandler: CoreGradesCourseOptionHandler, courseOptionsDelegate: CoreCourseOptionsDelegate) {
        mainMenuDelegate.registerHandler(gradesMenuHandler);
        courseOptionsDelegate.registerHandler(courseOptionHandler);
    }
}
