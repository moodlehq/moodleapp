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
import { IonicPage, NavParams } from 'ionic-angular';
import { AddonModWikiIndexComponent } from '../../components/index/index';

/**
 * Page that displays a wiki page.
 */
@IonicPage({ segment: 'addon-mod-wiki-index' })
@Component({
    selector: 'page-addon-mod-wiki-index',
    templateUrl: 'index.html',
})
export class AddonModWikiIndexPage {
    @ViewChild(AddonModWikiIndexComponent) wikiComponent: AddonModWikiIndexComponent;

    title: string;
    module: any;
    courseId: number;
    action: string;
    pageId: number;
    pageTitle: string;
    wikiId: number;
    subwikiId: number;
    userId: number;
    groupId: number;

    constructor(navParams: NavParams) {
        this.module = navParams.get('module') || {};
        this.courseId = navParams.get('courseId');
        this.action = navParams.get('action') || 'page';
        this.pageId = navParams.get('pageId');
        this.pageTitle = navParams.get('pageTitle');
        this.wikiId = navParams.get('wikiId');
        this.subwikiId = navParams.get('subwikiId');
        this.userId = navParams.get('userId');
        this.groupId = navParams.get('groupId');

        this.title = this.pageTitle || this.module.name;
    }

    /**
     * Update some data based on the data received.
     *
     * @param {any} data The data received.
     */
    updateData(data: any): void {
        if (typeof data == 'string') {
            // We received the title to display.
            this.title = data;
        } else {
            // We received a wiki instance.
            this.title = this.pageTitle || data.title || this.title;
        }
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.wikiComponent.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.wikiComponent.ionViewDidLeave();
    }
}
