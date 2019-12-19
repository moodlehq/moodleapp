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
import { IonicPage, NavParams, NavController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreSiteHomeIndexComponent } from '../../components/index/index';

/**
 * Page that displays site home index.
 */
@IonicPage({ segment: 'core-sitehome-index' })
@Component({
    selector: 'page-core-sitehome-index',
    templateUrl: 'index.html',
})
export class CoreSiteHomeIndexPage {
    @ViewChild(CoreSiteHomeIndexComponent) siteHomeComponent: CoreSiteHomeIndexComponent;

    constructor(navParams: NavParams, navCtrl: NavController, courseHelper: CoreCourseHelperProvider,
            sitesProvider: CoreSitesProvider) {
        const module = navParams.get('module'),
            modParams = navParams.get('modParams');

        if (module) {
            courseHelper.openModule(navCtrl, module, sitesProvider.getCurrentSite().getSiteHomeId(), undefined, modParams);
        }
    }
}
