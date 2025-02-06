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

import { ContextLevel } from '@/core/constants';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, Input, Output, OnInit, EventEmitter, ChangeDetectorRef, Type, ElementRef, ViewChild } from '@angular/core';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreQuestionBehaviourDelegate } from '@features/question/services/behaviour-delegate';
import { CoreQuestionDelegate } from '@features/question/services/question-delegate';

import { CoreQuestionBehaviourButton, CoreQuestionHelper, CoreQuestionQuestion } from '@features/question/services/question-helper';
import { CoreDomUtils } from '@services/utils/dom';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreLogger } from '@singletons/logger';
import { CoreObject } from '@singletons/object';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';
import { AsyncDirective } from '@classes/async-directive';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render a question.
 */
@Component({
    selector: 'core-question',
    templateUrl: 'core-question.html',
    styleUrl: '../../question.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreQuestionComponent implements OnInit, AsyncDirective {

    @Input() question?: CoreQuestionQuestion; // The question to render.
    @Input() component?: string; // The component the question belongs to.
    @Input() componentId?: number; // ID of the component the question belongs to.
    @Input() attemptId?: number; // Attempt ID.
    @Input() usageId?: number; // Usage ID.
    @Input({ transform: toBoolean }) offlineEnabled = false; // Whether the question can be answered in offline.
    @Input() contextLevel?: ContextLevel; // The context level.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the question belongs to (if any). It can be used to improve performance with filters.
    @Input({ transform: toBoolean }) review = false; // Whether the user is in review mode.
    @Input() preferredBehaviour?: string; // Behaviour to use.
    @Output() buttonClicked = new EventEmitter<CoreQuestionBehaviourButton>(); // Will emit when a behaviour button is clicked.
    @Output() onAbort= new EventEmitter<void>(); // Will emit an event if the question should be aborted.

    @ViewChild(CoreDynamicComponent)
        set dynComponent(el: CoreDynamicComponent<CoreQuestionBaseComponent>) {
            if (!el) {
                return;
            }

            this.promisedDynamicComponent.resolve(el);
        }

    componentClass?: Type<unknown>; // The class of the component to render.
    data: Record<string, unknown> = {}; // Data to pass to the component.
    seqCheck?: { name: string; value: string }; // Sequenche check name and value (if any).
    behaviourComponents?: Type<unknown>[] = []; // Components to render the question behaviour.

    validationError?: string;

    protected promisedDynamicComponent = new CorePromisedValue<CoreDynamicComponent<CoreQuestionBaseComponent>>();
    protected showQuestionPromise = new CorePromisedValue<void>();

    protected logger: CoreLogger;

    get showQuestion(): boolean {
        return this.showQuestionPromise.isResolved();
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        await this.showQuestionPromise;
        const dynamicComponent = await this.promisedDynamicComponent;

        return dynamicComponent.ready();
    }

    constructor(protected changeDetector: ChangeDetectorRef, private element: ElementRef) {
        this.logger = CoreLogger.getInstance('CoreQuestionComponent');
        CoreDirectivesRegistry.register(this.element.nativeElement, this);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.question || (this.question.type !== 'random' &&
                !CoreQuestionDelegate.isQuestionSupported(this.question.type))) {
            this.showQuestionPromise.resolve();

            return;
        }

        // Get the component to render the question.
        this.componentClass = await CorePromiseUtils.ignoreErrors(
            CoreQuestionDelegate.getComponentForQuestion(this.question),
        );

        if (!this.componentClass) {
            this.showQuestionPromise.resolve();

            return;
        }

        // Set up the data needed by the question and behaviour components.
        this.data = {
            question: this.question,
            component: this.component,
            componentId: this.componentId,
            attemptId: this.attemptId,
            offlineEnabled: this.offlineEnabled,
            contextLevel: this.contextLevel,
            contextInstanceId: this.contextInstanceId,
            courseId: this.courseId,
            review: this.review,
            preferredBehaviour: this.preferredBehaviour,
            buttonClicked: this.buttonClicked,
            onAbort: this.onAbort,
        };

        // Treat the question.
        CoreQuestionHelper.extractQuestionScripts(this.question, this.usageId);

        // Handle question behaviour.
        const behaviour = CoreQuestionDelegate.getBehaviourForQuestion(
            this.question,
            this.preferredBehaviour || '',
        );
        if (!CoreQuestionBehaviourDelegate.isBehaviourSupported(behaviour)) {
            // Behaviour not supported, abort.
            this.logger.warn('Aborting question because the behaviour is not supported.', this.question.slot);
            CoreQuestionHelper.showComponentError(
                this.onAbort,
                Translate.instant('addon.mod_quiz.errorbehaviournotsupported') + ' ' + behaviour,
            );

            return;
        }

        // Get the sequence check (hidden input). This is required.
        this.seqCheck = CoreQuestionHelper.getQuestionSequenceCheckFromHtml(this.question.html);
        if (!this.seqCheck) {
            this.logger.warn('Aborting question because couldn\'t retrieve sequence check.', this.question.slot);
            CoreQuestionHelper.showComponentError(this.onAbort);

            return;
        }

        CoreQuestionHelper.extractQbehaviourRedoButton(this.question);

        // Load local answers if offline is enabled.
        if (this.offlineEnabled && this.component && this.attemptId) {
            await CoreQuestionHelper.loadLocalAnswers(this.question, this.component, this.attemptId);
        } else {
            this.question.localAnswers = {};
        }

        // Load the local answers in the HTML.
        CoreQuestionHelper.loadLocalAnswersInHtml(this.question);

        // Try to extract the feedback and comment for the question.
        CoreQuestionHelper.extractQuestionFeedback(this.question);
        CoreQuestionHelper.extractQuestionComment(this.question);

        try {
            // Handle behaviour.
            this.behaviourComponents = await CoreQuestionBehaviourDelegate.handleQuestion(
                this.preferredBehaviour || '',
                this.question,
            );
        } finally {
            this.question.html = CoreDomUtils.removeElementFromHtml(this.question.html, '.im-controls');
            this.showQuestionPromise.resolve();
            await this.loadValidationError();
        }
    }

    /**
     * Load the validation error of the question.
     */
    async loadValidationError(): Promise<void> {
        if (!this.question) {
            return;
        }

        // Ensure question is completely initialized.
        await this.ready();

        // Extract the validation error of the question.
        this.validationError = CoreQuestionHelper.getValidationErrorFromHtml(this.question.html);

        // Load local answers if offline is enabled.
        if (this.offlineEnabled && this.component && this.attemptId) {
            if (this.question.localAnswers && !CoreObject.isEmpty(this.question.localAnswers)) {
                this.validationError = CoreQuestionDelegate.getValidationError(
                    this.question,
                    this.question.localAnswers,
                    this.validationError,
                    this.component,
                    this.attemptId,
                );
            }
        }
    }

    /**
     * Update the sequence check of the question.
     *
     * @param sequenceChecks Object with sequence checks. The keys are the question slot.
     */
    updateSequenceCheck(sequenceChecks: Record<number, { name: string; value: string }>): void {
        if (!this.question || !sequenceChecks[this.question.slot]) {
            return;
        }

        this.seqCheck = sequenceChecks[this.question.slot];
        this.changeDetector.detectChanges();
    }

}
