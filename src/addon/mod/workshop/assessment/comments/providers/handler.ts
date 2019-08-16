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

import { Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AddonWorkshopAssessmentStrategyHandler } from '../../../providers/assessment-strategy-delegate';
import { AddonModWorkshopAssessmentStrategyCommentsComponent } from '../component/comments';

/**
 * Handler for comments assessment strategy plugin.
 */
@Injectable()
export class AddonModWorkshopAssessmentStrategyCommentsHandler implements AddonWorkshopAssessmentStrategyHandler {
    name = 'AddonModWorkshopAssessmentStrategyComments';
    strategyName = 'comments';

    constructor(private translate: TranslateService) {}

    /**
     * Whether or not the handler is enabled on a site level.
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Return the Component to render the plugin.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param {Injector} injector Injector.
     * @return {any|Promise<any>} The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any> {
        return AddonModWorkshopAssessmentStrategyCommentsComponent;
    }

    /**
     * Prepare original values to be shown and compared.
     *
     * @param  {any}    form       Original data of the form.
     * @param  {number} workshopId Workshop Id
     * @return {Promise<any[]>}    Promise resolved with original values sorted.
     */
     getOriginalValues(form: any, workshopId: number): Promise<any[]> {
        const originalValues = [];

        form.fields.forEach((field, n) => {
            field.dimtitle = this.translate.instant('addon.mod_workshop_assessment_comments.dimensionnumber', {$a: field.number});

            if (!form.current[n]) {
                form.current[n] = {};
            }

            originalValues[n] = {
                peercomment: form.current[n].peercomment || '',
                number: field.number
            };
        });

        return Promise.resolve(originalValues);
    }

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param  {any[]} originalValues Original values of the form.
     * @param  {any[]} currentValues  Current values of the form.
     * @return {boolean}              True if data has changed, false otherwise.
     */
    hasDataChanged(originalValues: any[], currentValues: any[]): boolean {
        for (const x in originalValues) {
            if (originalValues[x].peercomment != currentValues[x].peercomment) {
                return true;
            }
        }

        return false;
    }

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param  {any{}} currentValues Current values of the form.
     * @param  {any}   form          Assessment form data.
     * @return {Promise<any>}        Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(currentValues: any[], form: any): Promise<any> {
        const data = {};
        const errors = {};
        let hasErrors = false;

        form.fields.forEach((field, idx) => {
            if (idx < form.dimenssionscount) {
                if (currentValues[idx].peercomment) {
                    data['peercomment__idx_' + idx] = currentValues[idx].peercomment;
                } else {
                    errors['peercomment_' + idx] = this.translate.instant('core.err_required');
                    hasErrors = true;
                }

                data['gradeid__idx_' + idx] = parseInt(form.current[idx].gradeid, 10) || 0;
                data['dimensionid__idx_' + idx] = parseInt(field.dimensionid, 10);
            }
        });

        if (hasErrors) {
            return Promise.reject(errors);
        }

        return Promise.resolve(data);
    }
}
