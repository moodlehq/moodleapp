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
import { CoreNavigator } from '@services/navigator';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page to display a URL in an iframe.
 */
@Component({
    selector: 'core-viewer-iframe',
    templateUrl: 'iframe.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreViewerIframePage implements OnInit {

    title?: string; // Page title.
    url?: string; // Iframe URL.
    autoLogin?: boolean; // Whether to try to use auto-login.

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.title = CoreNavigator.getRequiredRouteParam('title');
            this.url = CoreNavigator.getRequiredRouteParam('url');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        this.autoLogin = CoreNavigator.getRouteBooleanParam('autoLogin') ?? true;
    }

}
