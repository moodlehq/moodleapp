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
import { TestsBehatBlockingService } from './services/behat-blocking';
import { BehatTestsWindow, TestsBehatRuntime } from './services/behat-runtime';

function initializeBehatTestsWindow(window: BehatTestsWindow) {
    // Make functions publicly available for Behat to call.
    window.behatInit = TestsBehatRuntime.init;
}

@NgModule({
    providers:
        CoreAppProvider.isAutomated()
            ? [
                { provide: APP_INITIALIZER, multi: true, useValue: () => initializeBehatTestsWindow(window) },
                TestsBehatBlockingService,
            ]
            : [],
})
export class BehatTestingModule {}
