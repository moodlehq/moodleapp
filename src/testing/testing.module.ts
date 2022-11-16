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
import { CoreAppProvider } from '@services/app';
import moment from 'moment-timezone';
import { TestingBehatRuntime, TestingBehatRuntimeService } from './services/behat-runtime';

type AutomatedTestsWindow = Window & {
    behat?: TestingBehatRuntimeService;
};

function initializeAutomatedTests(window: AutomatedTestsWindow) {
    if (!CoreAppProvider.isAutomated()) {
        return;
    }

    window.behat = TestingBehatRuntime.instance;

    // Force timezone for automated tests.
    moment.tz.setDefault(CoreAppProvider.getForcedTimezone());
}

@NgModule({
    providers: [
        {
            provide: APP_INITIALIZER,
            multi: true,
            useValue: () => {
                initializeAutomatedTests(window);
            },
        },
    ],
})
export class TestingModule {}
