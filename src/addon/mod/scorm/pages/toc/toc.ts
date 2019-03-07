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
import { AddonModScormProvider } from '../../providers/scorm';

/**
 * Modal to display the TOC of a SCORM.
 */
@IonicPage({ segment: 'addon-mod-scorm-toc-modal' })
@Component({
    selector: 'page-addon-mod-scorm-toc',
    templateUrl: 'toc.html'
})
export class AddonModScormTocPage {
    toc: any[];
    isBrowse: boolean;
    isReview: boolean;
    attemptToContinue: number;
    selected: number;

    constructor(navParams: NavParams, private viewCtrl: ViewController) {
        this.toc = navParams.get('toc') || [];
        this.attemptToContinue = navParams.get('attemptToContinue');

        const mode = navParams.get('mode');
        this.selected = navParams.get('selected');

        this.isBrowse = mode === AddonModScormProvider.MODEBROWSE;
        this.isReview = mode === AddonModScormProvider.MODEREVIEW;
    }

    /**
     * Function called when a SCO is clicked.
     *
     * @param {any} sco Clicked SCO.
     */
    loadSco(sco: any): void {
        if (!sco.prereq || !sco.isvisible || !sco.launch) {
            return;
        }

        this.viewCtrl.dismiss(sco);
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
