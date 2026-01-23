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

import {
    AddonModWorkshopAssessmentStrategyFieldErrors,
} from '@addons/mod/workshop/components/assessment-strategy/assessment-strategy';
import {
    AddonModWorkshopGetAssessmentFormDefinitionData,
    AddonModWorkshopGetAssessmentFormFieldsParsedData,
} from '@addons/mod/workshop/services/workshop';
import { Injectable, Type } from '@angular/core';
import { CoreGradesHelper } from '@features/grades/services/grades-helper';
import { makeSingleton, Translate } from '@singletons';
import { CoreFormFields } from '@singletons/form';
import { AddonWorkshopAssessmentStrategyHandler } from '../../../services/assessment-strategy-delegate';
import { AddonModWorkshopAssessmentStrategyAccumulativeHandlerService } from './handler';

/**
 * Handler for accumulative assessment strategy plugin.
 */
@Injectable({ providedIn: 'root' })
export class AddonModWorkshopAssessmentStrategyAccumulativeHandlerLazyService
    extends AddonModWorkshopAssessmentStrategyAccumulativeHandlerService
    implements AddonWorkshopAssessmentStrategyHandler {

    /**
     * @inheritdoc
     */
    async getComponent(): Promise<Type<unknown>> {
        const { AddonModWorkshopAssessmentStrategyAccumulativeComponent } = await import('../component/accumulative');

        return AddonModWorkshopAssessmentStrategyAccumulativeComponent;
    }

    /**
     * @inheritdoc
     */
    async getOriginalValues(
        form: AddonModWorkshopGetAssessmentFormDefinitionData,
    ): Promise<AddonModWorkshopGetAssessmentFormFieldsParsedData[]> {
        const defaultGrade = Translate.instant('core.choosedots');
        const originalValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[] = [];
        const promises: Promise<void>[] = [];

        form.fields.forEach((field, n) => {
            field.dimtitle = Translate.instant('addon.mod_workshop_assessment_accumulative.dimensionnumber', { $a: field.number });

            if (!form.current[n]) {
                form.current[n] = {};
            }

            originalValues[n] = {};
            originalValues[n].peercomment = form.current[n].peercomment || '';
            originalValues[n].number = field.number; // eslint-disable-line id-denylist

            form.current[n].grade = form.current[n].grade ? parseInt(String(form.current[n].grade), 10) : -1;

            const gradingType = parseInt(String(field.grade), 10);
            const dimension = form.dimensionsinfo.find((dimension) => dimension.id == parseInt(field.dimensionid, 10));
            const scale = dimension && gradingType < 0 ? dimension.scale : undefined;

            promises.push(CoreGradesHelper.makeGradesMenu(gradingType, undefined, defaultGrade, -1, scale).then((grades) => {
                field.grades = grades;
                originalValues[n].grade = form.current[n].grade;

                return;
            }));
        });

        await Promise.all(promises);

        return originalValues;
    }

    /**
     * @inheritdoc
     */
    hasDataChanged(
        originalValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
        currentValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
    ): boolean {
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
     * @inheritdoc
     */
    async prepareAssessmentData(
        currentValues: AddonModWorkshopGetAssessmentFormFieldsParsedData[],
        form: AddonModWorkshopGetAssessmentFormDefinitionData,
    ): Promise<CoreFormFields> {
        const data: CoreFormFields = {};
        const errors: AddonModWorkshopAssessmentStrategyFieldErrors = {};
        let hasErrors = false;

        form.fields.forEach((field, idx) => {
            if (idx < form.dimenssionscount) {
                const grade = parseInt(String(currentValues[idx].grade), 10);
                if (!isNaN(grade) && grade >= 0) {
                    data[`grade__idx_${idx}`] = grade;
                } else {
                    errors[`grade_${idx}`] = Translate.instant('addon.mod_workshop_assessment_accumulative.mustchoosegrade');
                    hasErrors = true;
                }

                data[`peercomment__idx_${idx}`] = currentValues[idx].peercomment ?? '';

                data[`gradeid__idx_${idx}`] = parseInt(form.current[idx].gradeid, 10) || 0;
                data[`dimensionid__idx_${idx}`] = parseInt(field.dimensionid, 10);
                data[`weight__idx_${idx}`] = parseInt(field.weight, 10) || 0;
            }
        });

        if (hasErrors) {
            throw errors;
        }

        return data;
    }

}
export const AddonModWorkshopAssessmentStrategyAccumulativeHandler =
    makeSingleton(AddonModWorkshopAssessmentStrategyAccumulativeHandlerLazyService);
