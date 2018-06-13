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
import { FormGroup } from '@angular/forms';

/**
 * Component that displays a quiz access rule created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-quiz-access-rule',
    templateUrl: 'core-siteplugins-quiz-access-rule.html',
})
export class CoreSitePluginsQuizAccessRuleComponent extends CoreSitePluginsCompileInitComponent implements OnInit {
    @Input() rule: string; // The name of the rule.
    @Input() quiz: any; // The quiz the rule belongs to.
    @Input() attempt: any; // The attempt being started/continued.
    @Input() prefetch: boolean; // Whether the user is prefetching the quiz.
    @Input() siteId: string; // Site ID.
    @Input() form: FormGroup; // Form where to add the form control.

    constructor(sitePluginsProvider: CoreSitePluginsProvider) {
        super(sitePluginsProvider);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Pass the input and output data to the component.
        this.jsData = {
            rule: this.rule,
            quiz: this.quiz,
            attempt: this.attempt,
            prefetch: this.prefetch,
            siteId: this.siteId,
            form: this.form
        };

        if (this.rule) {
            this.getHandlerData(this.rule);
        }
    }
}
