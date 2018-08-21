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
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Page that displays the phase info modal.
 */
@IonicPage({ segment: 'addon-mod-workshop-phase-info' })
@Component({
    selector: 'page-addon-mod-workshop-phase-info',
    templateUrl: 'phase.html',
})
export class AddonModWorkshopPhaseInfoPage {
    phases: any;
    workshopPhase: number;

    constructor(params: NavParams, private viewCtrl: ViewController, private utils: CoreUtilsProvider) {
        this.phases = params.get('phases');
        this.workshopPhase = params.get('workshopPhase');
        const externalUrl = params.get('externalUrl');

        // Treat phases.
        for (const x in this.phases) {
            this.phases[x].tasks.forEach((task) => {
                if (!task.link && (task.code == 'examples' || task.code == 'prepareexamples')) {
                    // Add links to manage examples.
                    task.link = externalUrl;
                }
            });
            const action = this.phases[x].actions.find((action) => {
                return action.url && action.type == 'switchphase';
            });
            this.phases[x].switchUrl = action ? action.url : '';
        }
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }

    /**
     * Open task.
     *
     * @param {any} task Task to be done.
     */
    runTask(task: any): void {
        if (task.code == 'submit') {
            // This will close the modal and go to the submit.
            this.viewCtrl.dismiss(true);
        } else if (task.link) {
            this.utils.openInBrowser(task.link);
        }
    }
}
