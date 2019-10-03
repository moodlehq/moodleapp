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

import { Component } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';

/**
 * Modal to display the map of a Wiki.
 */
@IonicPage({ segment: 'addon-mod-wiki-map' })
@Component({
    selector: 'page-addon-mod-wiki-map',
    templateUrl: 'map.html',
})
export class AddonModWikiMapPage {
    map: any[] = []; // Map of pages, categorized by letter.
    selected: number;
    moduleId: number;
    courseId: number;
    homeView: ViewController;

    constructor(navParams: NavParams, protected viewCtrl: ViewController) {
        this.constructMap(navParams.get('pages') || []);

        this.selected = navParams.get('selected');
        this.homeView = navParams.get('homeView');
        this.moduleId = navParams.get('moduleId');
        this.courseId = navParams.get('courseId');
    }

    /**
     * Function called when a page is clicked.
     *
     * @param page Clicked page.
     */
    goToPage(page: any): void {
        this.viewCtrl.dismiss({type: 'page', goto: page});
    }

    /**
     * Go back to the initial page of the wiki.
     */
    goToWikiHome(): void {
        this.viewCtrl.dismiss({type: 'home', goto: this.homeView});
    }

    /**
     * Construct the map of pages.
     *
     * @param pages List of pages.
     */
    protected constructMap(pages: any[]): void {
        let letter,
            initialLetter;

        this.map = [];
        pages.sort((a, b) => {
            const compareA = a.title.toLowerCase().trim(),
                compareB = b.title.toLowerCase().trim();

            return compareA.localeCompare(compareB);
        });

        pages.forEach((page) => {
            const letterCandidate = page.title.charAt(0).toLocaleUpperCase();

            // Should we create a new grouping?
            if (letterCandidate !== initialLetter) {
                initialLetter = letterCandidate;
                letter = {label: letterCandidate, pages: []};

                this.map.push(letter);
            }

            // Add the subwiki to the currently active grouping.
            letter.pages.push(page);
        });
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
