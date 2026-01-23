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
import { TestingBehatRuntime, TestingBehatRuntimeService } from './services/behat-runtime';
import { CorePlatform } from '@services/platform';

type AutomatedTestsWindow = Window & {
    behat?: TestingBehatRuntimeService;
};

/**
 * Initialize automated tests.
 *
 * @param window Window.
 */
async function initializeAutomatedTests(window: AutomatedTestsWindow) {
    if (!CorePlatform.isAutomated()) {
        return;
    }

    window.behat = TestingBehatRuntime.instance;
}

@NgModule({
    providers: [
        provideAppInitializer(() => initializeAutomatedTests(window)),
    ],
})
export class TestingModule {}
