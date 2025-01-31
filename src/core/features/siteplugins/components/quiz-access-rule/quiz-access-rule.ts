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

import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { AddonModQuizAccessRuleDelegate } from '@addons/mod/quiz/services/access-rules-delegate';
import { AddonModQuizAttemptWSData, AddonModQuizQuizWSData } from '@addons/mod/quiz/services/quiz';
import { CoreSitePluginsCompileInitComponent } from '@features/siteplugins/classes/compile-init-component';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreCompileHtmlComponent } from '@features/compile/components/compile-html/compile-html';
import { CoreSharedModule } from '@/core/shared.module';
import { getModQuizComponentModules } from '@addons/mod/quiz/quiz.module';

/**
 * Component that displays a quiz access rule created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-quiz-access-rule',
    templateUrl: 'core-siteplugins-quiz-access-rule.html',
    styles: [':host { display: contents; }'],
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCompileHtmlComponent,
    ],
})
export class CoreSitePluginsQuizAccessRuleComponent extends CoreSitePluginsCompileInitComponent implements OnInit {

    @Input() rule?: string; // The name of the rule.
    @Input() quiz?: AddonModQuizQuizWSData; // The quiz the rule belongs to.
    @Input() attempt?: AddonModQuizAttemptWSData; // The attempt being started/continued.
    @Input({ transform: toBoolean }) prefetch = false; // Whether the user is prefetching the quiz.
    @Input() siteId?: string; // Site ID.
    @Input() form?: FormGroup; // Form where to add the form control.

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Pass the input and output data to the component.
        this.jsData.rule = this.rule;
        this.jsData.quiz = this.quiz;
        this.jsData.attempt = this.attempt;
        this.jsData.prefetch = this.prefetch;
        this.jsData.siteId = this.siteId;
        this.jsData.form = this.form;

        this.extraImports = await getModQuizComponentModules();

        if (this.rule) {
            this.getHandlerData(AddonModQuizAccessRuleDelegate.getHandlerName(this.rule));
        }
    }

}
