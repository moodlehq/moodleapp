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

import { Component, OnInit, ViewChild, ElementRef, Input, Type, inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CoreSites } from '@services/sites';
import { CoreForms } from '@singletons/form';
import { ModalController, Translate } from '@singletons';
import { AddonModQuizAccessRuleDelegate } from '../../services/access-rules-delegate';
import { AddonModQuizAttemptWSData, AddonModQuizQuizWSData } from '../../services/quiz';
import { CoreDom } from '@singletons/dom';
import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Modal that renders the access rules for a quiz.
 */
@Component({
    selector: 'page-addon-mod-quiz-preflight-modal',
    templateUrl: 'preflight-modal.html',
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModQuizPreflightModalComponent implements OnInit {

    protected element: HTMLElement = inject(ElementRef).nativeElement;

    @ViewChild('preflightFormEl') formElement?: ElementRef;

    @Input({ required: true }) title!: string;
    @Input() quiz?: AddonModQuizQuizWSData;
    @Input() attempt?: AddonModQuizAttemptWSData;
    @Input({ transform: toBoolean }) prefetch = false;
    @Input({ required: true }) siteId!: string;
    @Input({ required: true }) rules!: string[];

    preflightForm: FormGroup;
    accessRulesData: { component: Type<unknown>; data: Record<string, unknown>}[] = []; // Component and data for each access rule.
    loaded = false;

    constructor() {
        const formBuilder = inject(FormBuilder);

        // Create an empty form group. The controls will be added by the access rules components.
        this.preflightForm = formBuilder.group({});
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.title = this.title || Translate.instant('addon.mod_quiz.startattempt');
        this.siteId = this.siteId || CoreSites.getCurrentSiteId();
        this.rules = this.rules || [];

        if (!this.quiz) {
            return;
        }

        try {
            const quiz = this.quiz;

            await Promise.all(this.rules.map(async (rule) => {
                // Check if preflight is required for rule and, if so, get the component to render it.
                const required = await AddonModQuizAccessRuleDelegate.isPreflightCheckRequiredForRule(
                    rule,
                    quiz,
                    this.attempt,
                    this.prefetch,
                    this.siteId,
                );

                if (!required) {
                    return;
                }

                const component = await AddonModQuizAccessRuleDelegate.getPreflightComponent(rule);
                if (!component) {
                    return;
                }

                this.accessRulesData.push({
                    component,
                    data: {
                        rule: rule,
                        quiz: this.quiz,
                        attempt: this.attempt,
                        prefetch: this.prefetch,
                        form: this.preflightForm,
                        siteId: this.siteId,
                    },
                });
            }));

        } catch (error) {
            CoreAlerts.showError(error, { default: 'Error loading rules' });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Check that the data is valid and send it back.
     *
     * @param e Event.
     */
    async sendData(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        if (!this.preflightForm.valid) {
            // Form not valid. Scroll to the first element with errors.
            const hasScrolled = await CoreDom.scrollToInputError(
                this.element,
            );

            if (!hasScrolled) {
                // Input not found, show an error modal.
                CoreAlerts.showError(Translate.instant('core.errorinvalidform'));
            }
        } else {
            CoreForms.triggerFormSubmittedEvent(this.formElement, false, this.siteId);

            ModalController.dismiss(this.preflightForm.value);
        }
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        CoreForms.triggerFormCancelledEvent(this.formElement, this.siteId);

        ModalController.dismiss();
    }

}
