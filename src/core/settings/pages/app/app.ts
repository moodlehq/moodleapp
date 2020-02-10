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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavParams, Platform } from 'ionic-angular';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Page that displays the list of app settings pages.
 */
@IonicPage({segment: 'core-settings-app'})
@Component({
    selector: 'page-core-settings-app',
    templateUrl: 'app.html',
})
export class CoreAppSettingsPage {
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    isIOS: boolean;
    selectedPage: string;

    constructor(platorm: Platform,
            navParams: NavParams) {
        this.isIOS = platorm.is('ios');

        this.selectedPage = navParams.get('page') || false;
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.selectedPage) {
            this.openHandler(this.selectedPage);
        } else if (this.splitviewCtrl.isOn()) {
            this.openHandler('CoreSettingsGeneralPage');
        }

    }

    /**
     * Open a handler.
     *
     * @param page Page to open.
     * @param params Params of the page to open.
     */
    openHandler(page: string, params?: any): void {
        this.selectedPage = page;
        this.splitviewCtrl.push(page, params);
    }

}
