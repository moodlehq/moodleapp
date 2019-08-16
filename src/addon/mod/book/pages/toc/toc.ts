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

import { Component } from '@angular/core';
import { IonicPage, NavParams, ViewController } from 'ionic-angular';
import { AddonModBookTocChapter } from '../../providers/book';

/**
 * Modal to display the TOC of a book.
 */
@IonicPage({ segment: 'addon-mod-book-toc-modal' })
@Component({
    selector: 'page-addon-mod-book-toc',
    templateUrl: 'toc.html'
})
export class AddonModBookTocPage {
    chapters: AddonModBookTocChapter[];
    selected: number;

    constructor(navParams: NavParams, private viewCtrl: ViewController) {
        this.chapters = navParams.get('chapters') || [];
        this.selected = navParams.get('selected');
    }

    /**
     * Function called when a course is clicked.
     *
     * @param {string} id ID of the clicked chapter.
     */
    loadChapter(id: string): void {
        this.viewCtrl.dismiss(id);
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
