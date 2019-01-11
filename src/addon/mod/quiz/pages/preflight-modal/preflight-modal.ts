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

import { Component, OnInit, Injector, ViewChild } from '@angular/core';
import { IonicPage, ViewController, NavParams, Content } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { AddonModQuizAccessRuleDelegate } from '../../providers/access-rules-delegate';

/**
 * Modal that renders the access rules for a quiz.
 */
@IonicPage({ segment: 'addon-mod-quiz-preflight-modal' })
@Component({
    selector: 'page-addon-mod-quiz-preflight-modal',
    templateUrl: 'preflight-modal.html',
})
export class AddonModQuizPreflightModalPage implements OnInit {

    @ViewChild(Content) content: Content;

    preflightForm: FormGroup;
    title: string;
    accessRulesData: {component: any, data: any}[] = []; // Components and data for each access rule.
    loaded: boolean;

    protected quiz: any;
    protected attempt: any;
    protected prefetch: boolean;
    protected siteId: string;
    protected rules: string[];

    constructor(params: NavParams, fb: FormBuilder, translate: TranslateService, sitesProvider: CoreSitesProvider,
            protected viewCtrl: ViewController, protected accessRuleDelegate: AddonModQuizAccessRuleDelegate,
            protected injector: Injector, protected domUtils: CoreDomUtilsProvider) {

        this.title = params.get('title') || translate.instant('addon.mod_quiz.startattempt');
        this.quiz = params.get('quiz');
        this.attempt = params.get('attempt');
        this.prefetch = params.get('prefetch');
        this.siteId = params.get('siteId') || sitesProvider.getCurrentSiteId();
        this.rules = params.get('rules') || [];

        // Create an empty form group. The controls will be added by the access rules components.
        this.preflightForm = fb.group({});
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        const promises = [];

        this.rules.forEach((rule) => {
            // Check if preflight is required for rule and, if so, get the component to render it.
            promises.push(this.accessRuleDelegate.isPreflightCheckRequiredForRule(rule, this.quiz, this.attempt, this.prefetch,
                    this.siteId).then((required) => {

                if (required) {
                    return this.accessRuleDelegate.getPreflightComponent(rule, this.injector).then((component) => {
                        if (component) {
                            this.accessRulesData.push({
                                component: component,
                                data: {
                                    rule: rule,
                                    quiz: this.quiz,
                                    attempt: this.attempt,
                                    prefetch: this.prefetch,
                                    form: this.preflightForm,
                                    siteId: this.siteId
                                }
                            });
                        }
                    });
                }
            }));
        });

        Promise.all(promises).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading rules');
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Check that the data is valid and send it back.
     *
     * @param {Event} e Event.
     */
    sendData(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        if (!this.preflightForm.valid) {
            // Form not valid. Scroll to the first element with errors.
            if (!this.domUtils.scrollToInputError(this.content)) {
                // Input not found, show an error modal.
                this.domUtils.showErrorModal('core.errorinvalidform', true);
            }
        } else {
            this.viewCtrl.dismiss(this.preflightForm.value);
        }
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        this.viewCtrl.dismiss();
    }
}
