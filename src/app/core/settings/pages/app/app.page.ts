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

import { CoreApp } from '@services/app';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';

@Component({
    selector: 'app-settings',
    templateUrl: 'app.html',
})
export class CoreSettingsAppPage implements OnInit {

    // @ViewChild(CoreSplitViewComponent) splitviewCtrl?: CoreSplitViewComponent;

    isIOS: boolean;
    selectedPage?: string;

    constructor(
        protected route: ActivatedRoute,
        protected router: Router, // Will be removed when splitview is implemented
    ) {
        this.isIOS = CoreApp.instance.isIOS();
        this.selectedPage = route.snapshot.paramMap.get('page') || undefined;

        if (this.selectedPage) {
            this.openSettings(this.selectedPage);
        }
    }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        if (this.selectedPage) {
            this.openSettings(this.selectedPage);
        } /* else if (this.splitviewCtrl!.isOn()) {
            this.openSettings('general');
        }*/
    }

    /**
     * Open a settings page.
     *
     * @param page Page to open.
     * @param params Params of the page to open.
     */
    openSettings(page: string, params?: Params): void {
        this.selectedPage = page;
        // this.splitviewCtrl!.push(page, params);
        this.router.navigate([page], { relativeTo: this.route, queryParams: params });
    }

}
