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
import { CoreGradesHelperProvider } from '@core/grades/providers/helper';
import { AddonWorkshopAssessmentStrategyHandler } from '../../../providers/assessment-strategy-delegate';
import { AddonModWorkshopAssessmentStrategyAccumulativeComponent } from '../component/accumulative';

/**
 * Handler for accumulative assessment strategy plugin.
 */
@Injectable()
export class AddonModWorkshopAssessmentStrategyAccumulativeHandler implements AddonWorkshopAssessmentStrategyHandler {
    name = 'AddonModWorkshopAssessmentStrategyAccumulative';
    strategyName = 'accumulative';

    constructor(private translate: TranslateService, private gradesHelper: CoreGradesHelperProvider) {}

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
        return AddonModWorkshopAssessmentStrategyAccumulativeComponent;
    }

    /**
     * Prepare original values to be shown and compared.
     *
     * @param  {any}    form       Original data of the form.
     * @param  {number} workshopId WorkShop Id
     * @return {Promise<any[]>}    Promise resolved with original values sorted.
     */
     getOriginalValues(form: any, workshopId: number): Promise<any[]> {
        const defaultGrade = this.translate.instant('core.choosedots'),
            originalValues = [],
            promises = [];

        form.fields.forEach((field, n) => {
            field.dimtitle = this.translate.instant(
                    'addon.mod_workshop_assessment_accumulative.dimensionnumber', {$a: field.number});

            if (!form.current[n]) {
                form.current[n] = {};
            }

            originalValues[n] = {
                peercomment: form.current[n].peercomment || '',
                number: field.number
            };

            form.current[n].grade = form.current[n].grade ? parseInt(form.current[n].grade, 10) : -1;

            const gradingType = parseInt(field.grade, 10);
            const dimension = form.dimensionsinfo.find((dimension) => dimension.id == field.dimensionid);
            const scale = dimension && gradingType < 0 ? dimension.scale : null;

            promises.push(this.gradesHelper.makeGradesMenu(gradingType, undefined, defaultGrade, -1, scale).then((grades) => {
                field.grades = grades;
                originalValues[n].grade = form.current[n].grade;
            }));
        });

        return Promise.all(promises).then(() => {
            return originalValues;
        });
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
     * @param  {any{}} currentValues Current values of the form.
     * @param  {any}   form          Assessment form data.
     * @return {Promise<any>}        Promise resolved with the data to be sent. Or rejected with the input errors object.
     */
    prepareAssessmentData(currentValues: any[], form: any): Promise<any> {
        const data =  {};
        const errors = {};
        let hasErrors = false;

        form.fields.forEach((field, idx) => {
            if (idx < form.dimenssionscount) {
                const grade = parseInt(currentValues[idx].grade, 10);
                if (!isNaN(grade) && grade >= 0) {
                    data['grade__idx_' + idx] = grade;
                } else {
                    errors['grade_' + idx] = this.translate.instant('addon.mod_workshop_assessment_accumulative.mustchoosegrade');
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
