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

import { Component, Input, OnInit } from '@angular/core';
import { CoreUtils } from '@services/utils/utils';
import { ModalController } from '@singletons';
import { AddonModWorkshopPhaseData, AddonModWorkshopPhaseTaskData } from '../../services/workshop';
import { AddonModWorkshopPhase } from '../../constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the phase info modal.
 */
@Component({
    templateUrl: 'phase-modal.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModWorkshopPhaseInfoModalComponent implements OnInit {

    @Input() phases!: AddonModWorkshopPhaseDataWithSwitch[];
    @Input() workshopPhase!: AddonModWorkshopPhase;
    @Input() showSubmit = false;
    @Input() externalUrl!: string;

    ngOnInit(): void {

        // Treat phases.
        for (const x in this.phases) {
            this.phases[x].tasks.forEach((task) => {
                if (!task.link && (task.code == 'examples' || task.code == 'prepareexamples')) {
                    // Add links to manage examples.
                    task.link = this.externalUrl;
                }
            });
            const action = this.phases[x].actions.find((action) => action.url && action.type == 'switchphase');
            this.phases[x].switchUrl = action ? action.url : '';
        }
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Open task.
     *
     * @param task Task to be done.
     */
    async runTask(task: AddonModWorkshopPhaseTaskData): Promise<void> {
        if (task.code == 'submit') {
            // This will close the modal and go to the submit.
            ModalController.dismiss(true);
        } else if (task.link) {
            CoreUtils.openInBrowser(task.link);
        }
    }

}

type AddonModWorkshopPhaseDataWithSwitch = AddonModWorkshopPhaseData & {
    switchUrl?: string;
};
