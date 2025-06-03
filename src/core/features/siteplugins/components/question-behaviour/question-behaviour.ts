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
import { CoreSharedModule } from '@/core/shared.module';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CoreCompileHtmlComponent } from '@features/compile/components/compile-html/compile-html';

import { CoreQuestionBehaviourDelegate } from '@features/question/services/behaviour-delegate';
import { CoreQuestionBehaviourButton, CoreQuestionQuestion } from '@features/question/services/question-helper';
import { CoreSitePluginsCompileInitComponent } from '@features/siteplugins/classes/compile-init-component';

/**
 * Component that displays a question behaviour created using a site plugin.
 */
@Component({
    selector: 'core-site-plugins-question-behaviour',
    templateUrl: 'core-siteplugins-question-behaviour.html',
    styles: [':host { display: contents; }'],
    imports: [
        CoreSharedModule,
        CoreCompileHtmlComponent,
    ],
})
export class CoreSitePluginsQuestionBehaviourComponent extends CoreSitePluginsCompileInitComponent implements OnInit {

    @Input() question?: CoreQuestionQuestion; // The question.
    @Input() component?: string; // The component the question belongs to.
    @Input() componentId?: number; // ID of the component the question belongs to.
    @Input() attemptId?: number; // Attempt ID.
    @Input({ transform: toBoolean }) offlineEnabled = false; // Whether the question can be answered in offline.
    @Input() contextLevel?: ContextLevel; // The context level.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the question belongs to (if any). It can be used to improve performance with filters.
    @Input({ transform: toBoolean }) review = false; // Whether the user is in review mode.
    @Input() preferredBehaviour?: string; // Preferred behaviour.
    @Output() buttonClicked = new EventEmitter<CoreQuestionBehaviourButton>(); // Will emit when a behaviour button is clicked.
    @Output() onAbort = new EventEmitter<void>(); // Should emit an event if the question should be aborted.

    constructor() {
        super();
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Pass the input and output data to the component.
        this.jsData.question = this.question;
        this.jsData.component = this.component;
        this.jsData.componentId = this.componentId;
        this.jsData.attemptId = this.attemptId;
        this.jsData.offlineEnabled = this.offlineEnabled;
        this.jsData.contextLevel = this.contextLevel;
        this.jsData.contextInstanceId = this.contextInstanceId;
        this.jsData.courseId = this.courseId;
        this.jsData.review = this.review;
        this.jsData.buttonClicked = this.buttonClicked;
        this.jsData.onAbort = this.onAbort;

        if (this.question) {
            this.getHandlerData(CoreQuestionBehaviourDelegate.getHandlerName(this.preferredBehaviour || ''));
        }
    }

}
