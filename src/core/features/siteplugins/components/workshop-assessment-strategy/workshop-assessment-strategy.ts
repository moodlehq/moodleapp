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

import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { AddonWorkshopAssessmentStrategyDelegate } from '@addons/mod/workshop/services/assessment-strategy-delegate';
import { AddonModWorkshopGetAssessmentFormFieldsParsedData } from '@addons/mod/workshop/services/workshop';
import { AddonModWorkshopSubmissionAssessmentWithFormData } from '@addons/mod/workshop/services/workshop-helper';
import { getModWorkshopComponentModules } from '@addons/mod/workshop/workshop.module';
import { Component, OnInit, Input } from '@angular/core';
import { CoreCompileHtmlComponent } from '@features/compile/components/compile-html/compile-html';
import { CoreSitePluginsCompileInitComponent } from '@features/siteplugins/classes/compile-init-component';

/**
 * Component that displays a workshop assessment strategy plugin created using a site plugin.
 */
@Component({
    selector: 'core-siteplugins-workshop-assessment-strategy',
    templateUrl: 'core-siteplugins-workshop-assessment-strategy.html',
    styles: [':host { display: contents; }'],
    imports: [
        CoreSharedModule,
        CoreCompileHtmlComponent,
    ],
})
export class CoreSitePluginsWorkshopAssessmentStrategyComponent extends CoreSitePluginsCompileInitComponent implements OnInit {

    @Input({ required: true }) workshopId!: number;
    @Input({ required: true }) assessment!: AddonModWorkshopSubmissionAssessmentWithFormData;
    @Input({ required: true, transform: toBoolean }) edit = false;
    @Input({ required: true }) selectedValues!: AddonModWorkshopGetAssessmentFormFieldsParsedData[];
    @Input({ required: true }) fieldErrors!: Record<string, string>;
    @Input({ required: true }) strategy!: string;
    @Input({ required: true }) moduleId!: number;
    @Input() courseId?: number;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Pass the input and output data to the component.
        this.jsData.workshopId = this.workshopId;
        this.jsData.assessment = this.assessment;
        this.jsData.edit = this.edit;
        this.jsData.selectedValues = this.selectedValues;
        this.jsData.fieldErrors = this.fieldErrors;
        this.jsData.strategy = this.strategy;

        this.extraImports = await getModWorkshopComponentModules();

        this.getHandlerData(AddonWorkshopAssessmentStrategyDelegate.getHandlerName(this.strategy));
    }

}
