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

/**
 * Page that displays the phase selector modal.
 */
@IonicPage({ segment: 'addon-mod-workshop-phase-selector' })
@Component({
    selector: 'page-addon-mod-workshop-phase-selector',
    templateUrl: 'phase.html',
})
export class AddonModWorkshopPhaseSelectorPage {
    selected: number;
    phases: any;
    workshopPhase: number;
    protected original: number;

    constructor(params: NavParams, private viewCtrl: ViewController) {
        this.selected = params.get('selected');
        this.original = this.selected;
        this.phases = params.get('phases');
        this.workshopPhase = params.get('workshopPhase');
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Select phase.
     */
    switchPhase(): void {
        // This is a quick hack to avoid the first switch phase call done just when opening the modal.
        if (this.original != this.selected) {
            this.viewCtrl.dismiss(this.selected);
        }
        this.original = null;
    }
}
