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

import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';

import { AddonModQuizQuestionBasicData, CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreDomUtils } from '@services/utils/dom';
import { AddonQtypeDdImageOrTextQuestion } from '../classes/ddimageortext';

/**
 * Component to render a drag-and-drop onto image question.
 */
@Component({
    selector: 'addon-qtype-ddimageortext',
    templateUrl: 'addon-qtype-ddimageortext.html',
    styleUrls: ['ddimageortext.scss'],
})
export class AddonQtypeDdImageOrTextComponent extends CoreQuestionBaseComponent implements OnInit, OnDestroy {

    ddQuestion?: AddonModQuizDdImageOrTextQuestionData;

    protected questionInstance?: AddonQtypeDdImageOrTextQuestion;
    protected drops?: unknown[]; // The drop zones received in the init object of the question.
    protected destroyed = false;
    protected textIsRendered = false;
    protected ddAreaisRendered = false;

    constructor(elementRef: ElementRef) {
        super('AddonQtypeDdImageOrTextComponent', elementRef);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        this.ddQuestion = this.question;

        const element = CoreDomUtils.convertToElement(this.ddQuestion.html);

        // Get D&D area and question text.
        const ddArea = element.querySelector('.ddarea');

        this.ddQuestion.text = CoreDomUtils.getContentsOfElement(element, '.qtext');
        if (!ddArea || typeof this.ddQuestion.text == 'undefined') {
            this.logger.warn('Aborting because of an error parsing question.', this.ddQuestion.slot);

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        // Set the D&D area HTML.
        this.ddQuestion.ddArea = ddArea.outerHTML;
        this.ddQuestion.readOnly = false;

        if (this.ddQuestion.initObjects) {
            // Moodle version <= 3.5.
            if (typeof this.ddQuestion.initObjects.drops != 'undefined') {
                this.drops = <unknown[]> this.ddQuestion.initObjects.drops;
            }
            if (typeof this.ddQuestion.initObjects.readonly != 'undefined') {
                this.ddQuestion.readOnly = !!this.ddQuestion.initObjects.readonly;
            }
        } else if (this.ddQuestion.amdArgs) {
            // Moodle version >= 3.6.
            if (typeof this.ddQuestion.amdArgs[1] != 'undefined') {
                this.ddQuestion.readOnly = !!this.ddQuestion.amdArgs[1];
            }
            if (typeof this.ddQuestion.amdArgs[2] != 'undefined') {
                this.drops = <unknown[]> this.ddQuestion.amdArgs[2];
            }
        }

        this.ddQuestion.loaded = false;
    }

    /**
     * The question ddArea has been rendered.
     */
    ddAreaRendered(): void {
        this.ddAreaisRendered = true;
        if (this.textIsRendered) {
            this.questionRendered();
        }
    }

    /**
     * The question text has been rendered.
     */
    textRendered(): void {
        this.textIsRendered = true;
        if (this.ddAreaisRendered) {
            this.questionRendered();
        }
    }

    /**
     * The question has been rendered.
     */
    protected questionRendered(): void {
        if (!this.destroyed && this.ddQuestion) {
            // Create the instance.
            this.questionInstance = new AddonQtypeDdImageOrTextQuestion(
                this.hostElement,
                this.ddQuestion,
                !!this.ddQuestion.readOnly,
                this.drops,
            );
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.destroyed = true;
        this.questionInstance?.destroy();
    }

}

/**
 * Data for DD Image or Text question.
 */
export type AddonModQuizDdImageOrTextQuestionData = AddonModQuizQuestionBasicData & {
    loaded?: boolean;
    readOnly?: boolean;
    ddArea?: string;
};
