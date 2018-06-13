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

import { Component, OnInit, Input } from '@angular/core';
import { CoreSitePluginsProvider } from '../../providers/siteplugins';
import { CoreSitePluginsCompileInitComponent } from '../../classes/compile-init-component';

/**
 * Component that displays a workshop assessment strategy plugin created using a site plugin.
 */
@Component({
    selector: 'core-siteplugins-workshop-assessment-strategy',
    templateUrl: 'core-siteplugins-workshop-assessment-strategy.html',
})
export class CoreSitePluginsWorkshopAssessmentStrategyComponent extends CoreSitePluginsCompileInitComponent implements OnInit {
    @Input() workshopId: number;
    @Input() assessment: any;
    @Input() edit: boolean;
    @Input() selectedValues: any[];
    @Input() fieldErrors: any;
    @Input() strategy: string;

    constructor(sitePluginsProvider: CoreSitePluginsProvider) {
        super(sitePluginsProvider);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Pass the input and output data to the component.
        this.jsData = {
            workshopId: this.workshopId,
            assessment: this.assessment,
            edit: this.edit,
            selectedValues: this.selectedValues,
            fieldErrors: this.fieldErrors,
            strategy: this.strategy
        };

        this.getHandlerData('workshopform_' + this.strategy);
    }
}
