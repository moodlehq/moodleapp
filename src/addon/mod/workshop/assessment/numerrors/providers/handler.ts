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

import { Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AddonWorkshopAssessmentStrategyHandler } from '../../../providers/assessment-strategy-delegate';
import { AddonModWorkshopAssessmentStrategyNumErrorsComponent } from '../component/numerrors';

/**
 * Handler for numerrors assessment strategy plugin.
 */
@Injectable()
export class AddonModWorkshopAssessmentStrategyNumErrorsHandler implements AddonWorkshopAssessmentStrategyHandler {
    name = 'AddonModWorkshopAssessmentStrategyNumErrors';
    strategyName = 'numerrors';

    constructor(private translate: TranslateService) {}

    /**
     * Whether or not the handler is enabled on a site level.
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return true;
    }

    /**
     * Return the Component to render the plugin.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getComponent(injector: Injector): any | Promise<any> {
        return AddonModWorkshopAssessmentStrategyNumErrorsComponent;
    }

    /**
     * Prepare original values to be shown and compared.
     *
     * @param form Original data of the form.
     * @param workshopId Workshop Id
     * @return Promise resolved with original values sorted.
     */
     getOriginalValues(form: any, workshopId: number): Promise<any[]> {
        const originalValues = [];

        form.fields.forEach((field, n) => {
            field.dimtitle = this.translate.instant('addon.mod_workshop_assessment_numerrors.dimensionnumber', {$a: field.number});

            if (!form.current[n]) {
                form.current[n] = {};
            }

            originalValues[n] = {
                peercomment: form.current[n].peercomment || '',
                number: field.number,
                grade: form.current[n].grade || ''
            };
        });

        return Promise.resolve(originalValues);
    }

    /**
     * Check if the assessment data has changed for a certain submission and workshop for a this strategy plugin.
     *
     * @param originalValues Original values of the form.
     * @param currentValues Current values of the form.
     * @return True if data has changed, false otherwise.
     */
    hasDataChanged(originalValues: any[], currentValues: any[]): boolean {
        for (const x in originalValues) {
            if (originalValues[x].grade != currentValues[x].grade) {
                return true;
            }
            if (originalValues[x].peercomment != currentValues[x].peercomment) {
                return true;
            }
        }

        return false;
    }

    /**
     * Prepare assessment data to be sent to the server depending on the strategy selected.
     *
     * @param currentValues Current values of the form.
     * @param form Assessment form data.
     * @return Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(currentValues: any[], form: any): Promise<any> {
        const data = {};
        const errors = {};
        let hasErrors = false;

        form.fields.forEach((field, idx) => {
            if (idx < form.dimenssionscount) {
                const grade = parseInt(currentValues[idx].grade);
                if (!isNaN(grade) && (grade == 1 || grade == -1)) {
                    data['grade__idx_' + idx] = grade;
                } else {
                    errors['grade_' + idx] = this.translate.instant('core.required');
                    hasErrors = true;
                }

                if (currentValues[idx].peercomment) {
                    data['peercomment__idx_' + idx] = currentValues[idx].peercomment;
                }

                data['gradeid__idx_' + idx] = parseInt(form.current[idx].gradeid, 10) || 0;
                data['dimensionid__idx_' + idx] = parseInt(field.dimensionid, 10);
                data['weight__idx_' + idx] = parseInt(field.weight, 10) ||  0;
            }
        });

        if (hasErrors) {
            return Promise.reject(errors);
        }

        return Promise.resolve(data);
    }
}
