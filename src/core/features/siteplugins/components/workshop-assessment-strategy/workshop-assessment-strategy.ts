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

import { AddonWorkshopAssessmentStrategyDelegate } from '@addons/mod/workshop/services/assessment-strategy-delegate';
import { AddonModWorkshopGetAssessmentFormFieldsParsedData } from '@addons/mod/workshop/services/workshop';
import { AddonModWorkshopSubmissionAssessmentWithFormData } from '@addons/mod/workshop/services/workshop-helper';
import { Component, OnInit, Input } from '@angular/core';
import { CoreSitePluginsCompileInitComponent } from '@features/siteplugins/classes/compile-init-component';

/**
 * Component that displays a workshop assessment strategy plugin created using a site plugin.
 */
@Component({
    selector: 'core-siteplugins-workshop-assessment-strategy',
    templateUrl: 'core-siteplugins-workshop-assessment-strategy.html',
    styles: [':host { display: contents; }'],
})
export class CoreSitePluginsWorkshopAssessmentStrategyComponent extends CoreSitePluginsCompileInitComponent implements OnInit {

    @Input() workshopId!: number;
    @Input() assessment!: AddonModWorkshopSubmissionAssessmentWithFormData;
    @Input() edit!: boolean;
    @Input() selectedValues!: AddonModWorkshopGetAssessmentFormFieldsParsedData[];
    @Input() fieldErrors!: Record<string, string>;
    @Input() strategy!: string;
    @Input() moduleId!: number;
    @Input() courseId?: number;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        // Pass the input and output data to the component.
        this.jsData.workshopId = this.workshopId;
        this.jsData.assessment = this.assessment;
        this.jsData.edit = this.edit;
        this.jsData.selectedValues = this.selectedValues;
        this.jsData.fieldErrors = this.fieldErrors;
        this.jsData.strategy = this.strategy;

        this.getHandlerData(AddonWorkshopAssessmentStrategyDelegate.getHandlerName(this.strategy));
    }

}
