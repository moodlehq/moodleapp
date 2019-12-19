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
import { IonicPage, NavParams } from 'ionic-angular';
import { AddonModDataIndexComponent } from '../../components/index/index';

/**
 * Page that displays a data.
 */
@IonicPage({ segment: 'addon-mod-data-index' })
@Component({
    selector: 'page-addon-mod-data-index',
    templateUrl: 'index.html',
})
export class AddonModDataIndexPage {
    @ViewChild(AddonModDataIndexComponent) dataComponent: AddonModDataIndexComponent;

    title: string;
    module: any;
    courseId: number;
    group: number;

    constructor(navParams: NavParams) {
        this.module = navParams.get('module') || {};
        this.courseId = navParams.get('courseId');
        this.group = navParams.get('group') || 0;
        this.title = this.module.name;
    }

    /**
     * Update some data based on the data instance.
     *
     * @param data Data instance.
     */
    updateData(data: any): void {
        this.title = data.name || this.title;
    }
}
