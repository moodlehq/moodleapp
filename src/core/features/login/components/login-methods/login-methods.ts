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

import { Component, OnInit } from '@angular/core';
import { CoreLoginHelper, CoreLoginMethod } from '@features/login/services/login-helper';
import { CoreSites } from '@services/sites';

@Component({
    selector: 'core-login-methods',
    templateUrl: 'login-methods.html',
    styleUrls: ['../../login.scss'],
})
export class CoreLoginMethodsComponent implements OnInit {

    loginMethods?: CoreLoginMethod[];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.loginMethods = await CoreLoginHelper.getLoginMethods();
        const currentSite = CoreSites.getCurrentSite();
        const defaultMethod = await CoreLoginHelper.getDefaultLoginMethod();

        if (currentSite?.isLoggedOut() && defaultMethod) {
            await defaultMethod.action();
        }
    }

}
