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

import { Component, OnInit, OnDestroy, Injector, ElementRef } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreQuestionBaseComponent } from '@core/question/classes/base-question-component';
import { AddonQtypeDdImageOrTextQuestion } from '../classes/ddimageortext';

/**
 * Component to render a drag-and-drop onto image question.
 */
@Component({
    selector: 'addon-qtype-ddimageortext',
    templateUrl: 'addon-qtype-ddimageortext.html'
})
export class AddonQtypeDdImageOrTextComponent extends CoreQuestionBaseComponent implements OnInit, OnDestroy {

    protected element: HTMLElement;
    protected questionInstance: AddonQtypeDdImageOrTextQuestion;
    protected drops: any[]; // The drop zones received in the init object of the question.
    protected destroyed = false;

    constructor(protected loggerProvider: CoreLoggerProvider, injector: Injector, element: ElementRef) {
        super(loggerProvider, 'AddonQtypeDdImageOrTextComponent', injector);

        this.element = element.nativeElement;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return this.questionHelper.showComponentError(this.onAbort);
        }

        const element = this.domUtils.convertToElement(this.question.html);

        // Get D&D area and question text.
        const ddArea = element.querySelector('.ddarea');

        this.question.text = this.domUtils.getContentsOfElement(element, '.qtext');
        if (!ddArea || typeof this.question.text == 'undefined') {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        // Set the D&D area HTML.
        this.question.ddArea = ddArea.outerHTML;
        this.question.readOnly = false;

        if (this.question.initObjects) {
            // Moodle version <= 3.5.
            if (typeof this.question.initObjects.drops != 'undefined') {
                this.drops = this.question.initObjects.drops;
            }
            if (typeof this.question.initObjects.readonly != 'undefined') {
                this.question.readOnly = this.question.initObjects.readonly;
            }
        } else if (this.question.amdArgs) {
            // Moodle version >= 3.6.
            if (typeof this.question.amdArgs[1] != 'undefined') {
                this.question.readOnly = this.question.amdArgs[1];
            }
            if (typeof this.question.amdArgs[2] != 'undefined') {
                this.drops = this.question.amdArgs[2];
            }
        }

        this.question.loaded = false;
    }

    /**
     * The question has been rendered.
     */
    questionRendered(): void {
        if (!this.destroyed) {
            // Create the instance.
            this.questionInstance = new AddonQtypeDdImageOrTextQuestion(this.loggerProvider, this.domUtils, this.element,
                    this.question, this.question.readOnly, this.drops);
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.destroyed = true;
        this.questionInstance && this.questionInstance.destroy();
    }
}
