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

import { NgModule } from '@angular/core';
import { CoreCronDelegate } from '@providers/cron';
import { CoreLoginHelperProvider } from './providers/helper';
import { CoreLoginCronHandler } from './providers/cron-handler';
import { CoreLoginSitesPageModule } from './pages/sites/sites.module';

// List of providers.
export const CORE_LOGIN_PROVIDERS = [
    CoreLoginHelperProvider,
    CoreLoginCronHandler
];

@NgModule({
    declarations: [
    ],
    imports: [
        CoreLoginSitesPageModule
    ],
    providers: CORE_LOGIN_PROVIDERS
})
export class CoreLoginModule {
    constructor(cronDelegate: CoreCronDelegate, cronHandler: CoreLoginCronHandler) {
        // Register handlers.
        cronDelegate.register(cronHandler);
    }
}
