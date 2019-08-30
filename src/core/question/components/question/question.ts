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

import { Component, Input, Output, OnInit, Injector, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreQuestionProvider } from '../../providers/question';
import { CoreQuestionDelegate } from '../../providers/delegate';
import { CoreQuestionBehaviourDelegate } from '../../providers/behaviour-delegate';
import { CoreQuestionHelperProvider } from '../../providers/helper';

/**
 * Component to render a question.
 */
@Component({
    selector: 'core-question',
    templateUrl: 'core-question.html'
})
export class CoreQuestionComponent implements OnInit {
    @Input() question: any; // The question to render.
    @Input() component: string; // The component the question belongs to.
    @Input() componentId: number; // ID of the component the question belongs to.
    @Input() attemptId: number; // Attempt ID.
    @Input() usageId: number; // Usage ID.
    @Input() offlineEnabled?: boolean | string; // Whether the question can be answered in offline.
    @Output() buttonClicked: EventEmitter<any>; // Will emit an event when a behaviour button is clicked.
    @Output() onAbort: EventEmitter<void>; // Will emit an event if the question should be aborted.

    componentClass: any; // The class of the component to render.
    data: any = {}; // Data to pass to the component.
    seqCheck: {name: string, value: string}; // Sequenche check name and value (if any).
    behaviourComponents: any[] = []; // Components to render the question behaviour.
    loaded = false;

    protected logger;

    constructor(logger: CoreLoggerProvider, protected injector: Injector, protected questionDelegate: CoreQuestionDelegate,
            protected utils: CoreUtilsProvider, protected behaviourDelegate: CoreQuestionBehaviourDelegate,
            protected questionHelper: CoreQuestionHelperProvider, protected translate: TranslateService,
            protected questionProvider: CoreQuestionProvider, protected domUtils: CoreDomUtilsProvider,
            protected cdr: ChangeDetectorRef) {
        logger = logger.getInstance('CoreQuestionComponent');

        this.buttonClicked = new EventEmitter();
        this.onAbort = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.offlineEnabled = this.utils.isTrueOrOne(this.offlineEnabled);

        if (!this.question || (this.question.type != 'random' && !this.questionDelegate.isQuestionSupported(this.question.type))) {
            this.loaded = true;

            return;
        }

        // Get the component to render the question.
        this.questionDelegate.getComponentForQuestion(this.injector, this.question).then((componentClass) => {
            this.componentClass = componentClass;

            if (componentClass) {
                // Set up the data needed by the question and behaviour components.
                this.data = {
                    question: this.question,
                    component: this.component,
                    componentId: this.componentId,
                    attemptId: this.attemptId,
                    offlineEnabled: this.offlineEnabled,
                    buttonClicked: this.buttonClicked,
                    onAbort: this.onAbort
                };

                // Treat the question.
                this.questionHelper.extractQuestionScripts(this.question, this.usageId);

                // Handle question behaviour.
                const behaviour = this.questionDelegate.getBehaviourForQuestion(this.question, this.question.preferredBehaviour);
                if (!this.behaviourDelegate.isBehaviourSupported(behaviour)) {
                    // Behaviour not supported, abort.
                    this.logger.warn('Aborting question because the behaviour is not supported.', this.question.name);
                    this.questionHelper.showComponentError(this.onAbort,
                        this.translate.instant('addon.mod_quiz.errorbehaviournotsupported') + ' ' + behaviour);

                    return;
                }

                // Get the sequence check (hidden input). This is required.
                this.seqCheck = this.questionHelper.getQuestionSequenceCheckFromHtml(this.question.html);
                if (!this.seqCheck) {
                    this.logger.warn('Aborting question because couldn\'t retrieve sequence check.', this.question.name);
                    this.questionHelper.showComponentError(this.onAbort);

                    return;
                }

                // Load local answers if offline is enabled.
                let promise;
                if (this.offlineEnabled) {
                    promise = this.questionProvider.getQuestionAnswers(this.component, this.attemptId, this.question.slot)
                            .then((answers) => {
                        this.question.localAnswers = this.questionProvider.convertAnswersArrayToObject(answers, true);
                    }).catch(() => {
                        this.question.localAnswers = {};
                    });
                } else {
                    this.question.localAnswers = {};
                    promise = Promise.resolve();
                }

                promise.then(() => {
                    // Handle behaviour.
                    this.behaviourDelegate.handleQuestion(this.injector, this.question.preferredBehaviour, this.question)
                            .then((comps) => {
                        this.behaviourComponents = comps;
                    }).finally(() => {
                        this.question.html = this.domUtils.removeElementFromHtml(this.question.html, '.im-controls');
                        this.loaded = true;
                    });

                    this.questionHelper.extractQbehaviourRedoButton(this.question);

                    // Extract the validation error of the question.
                    this.question.validationError = this.questionHelper.getValidationErrorFromHtml(this.question.html);

                    // Load the local answers in the HTML.
                    this.questionHelper.loadLocalAnswersInHtml(this.question);

                    // Try to extract the feedback and comment for the question.
                    this.questionHelper.extractQuestionFeedback(this.question);
                    this.questionHelper.extractQuestionComment(this.question);
                });
            } else {
                this.loaded = true;
            }
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Update the sequence check of the question.
     *
     * @param {any} sequenceChecks Object with sequence checks. The keys are the question slot.
     */
    updateSequenceCheck(sequenceChecks: any): void {
        if (sequenceChecks[this.question.slot]) {
            this.seqCheck = sequenceChecks[this.question.slot];
            this.cdr.detectChanges();
        }
    }
}
