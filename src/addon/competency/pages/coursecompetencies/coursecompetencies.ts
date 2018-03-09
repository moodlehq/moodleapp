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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '../../../../providers/app';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { AddonCompetencyProvider } from '../../providers/competency';
import { AddonCompetencyHelperProvider } from '../../providers/helper';

/**
 * Page that displays the list of competencies of a course.
 */
@IonicPage({ segment: 'addon-competency-coursecompetencies' })
@Component({
    selector: 'page-addon-competency-coursecompetencies',
    templateUrl: 'coursecompetencies.html',
})
export class AddonCompetencyCourseCompetenciesPage {

    protected courseId: number;
    protected userId: number;

    constructor(private navCtrl: NavController, navParams: NavParams, private translate: TranslateService,
            private appProvider: CoreAppProvider, private domUtils: CoreDomUtilsProvider,
            private competencyProvider: AddonCompetencyProvider, private helperProvider: AddonCompetencyHelperProvider) {
        this.courseId = navParams.get('courseId');
        this.userId = navParams.get('userId');
    }
}
