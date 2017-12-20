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
import { CoreCoursesProvider } from './providers/courses';
import { CoreCoursesMainMenuHandler } from './providers/handlers';
import { CoreCoursesMyOverviewProvider } from './providers/my-overview';
import { CoreCoursesDelegate } from './providers/delegate';
import { CoreMainMenuDelegate } from '../mainmenu/providers/delegate';

@NgModule({
    declarations: [],
    imports: [
    ],
    providers: [
        CoreCoursesProvider,
        CoreCoursesMainMenuHandler,
        CoreCoursesMyOverviewProvider,
        CoreCoursesDelegate
    ],
    exports: []
})
export class CoreCoursesModule {
    constructor(mainMenuDelegate: CoreMainMenuDelegate, mainMenuHandler: CoreCoursesMainMenuHandler) {
        mainMenuDelegate.registerHandler(mainMenuHandler);
    }
}
