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

import { Component, OnDestroy, ElementRef } from '@angular/core';

import { AddonModQuizQuestionBasicData, CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { AddonQtypeDdImageOrTextQuestion } from '../classes/ddimageortext';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreText } from '@singletons/text';

/**
 * Component to render a drag-and-drop onto image question.
 */
@Component({
    selector: 'addon-qtype-ddimageortext',
    templateUrl: 'addon-qtype-ddimageortext.html',
    styleUrls: ['../../../../core/features/question/question.scss', 'ddimageortext.scss'],
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonQtypeDdImageOrTextComponent
    extends CoreQuestionBaseComponent<AddonModQuizDdImageOrTextQuestionData>
    implements OnDestroy {

    protected questionInstance?: AddonQtypeDdImageOrTextQuestion;
    protected drops?: unknown[]; // The drop zones received in the init object of the question.
    protected destroyed = false;
    protected textIsRendered = false;
    protected ddAreaisRendered = false;

    constructor(elementRef: ElementRef) {
        super('AddonQtypeDdImageOrTextComponent', elementRef);
    }

    /**
     * @inheritdoc
     */
    init(): void {
        if (!this.question) {
            this.onReadyPromise.resolve();

            return;
        }

        const questionElement = this.initComponent();
        if (!questionElement) {
            this.onReadyPromise.resolve();

            return;
        }

        // Get D&D area and question text.
        const ddArea = questionElement.querySelector('.ddarea');
        if (!ddArea) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.slot);
            this.onReadyPromise.resolve();

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        // Set the D&D area HTML.
        this.question.ddArea = ddArea.outerHTML;
        this.question.readOnly = false;

        if (this.question.initObjects) {
            // Moodle version = 3.5.
            if (this.question.initObjects.drops !== undefined) {
                this.drops = <unknown[]> this.question.initObjects.drops;
            }
            if (this.question.initObjects.readonly !== undefined) {
                this.question.readOnly = !!this.question.initObjects.readonly;
            }
        } else if (this.question.amdArgs) {
            // Moodle version >= 3.6.
            if (this.question.amdArgs[1] !== undefined) {
                this.question.readOnly = !!this.question.amdArgs[1];
            }

            // Try to get drop info from data attribute (Moodle 5.1+). If not found, fallback to old way of retrieving it.
            const dropZones = ddArea.querySelector<HTMLElement>('.dropzones');
            const placeInfo = dropZones?.dataset.placeInfo ?
                CoreText.parseJSON(dropZones.dataset.placeInfo, null) :
                this.question.amdArgs[2];
            if (placeInfo) {
                this.drops = <unknown[]> placeInfo;
            }
        }

        this.question.loaded = false;
        this.onReadyPromise.resolve();
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
        if (!this.destroyed && this.question) {
            // Create the instance.
            this.questionInstance = new AddonQtypeDdImageOrTextQuestion(
                this.hostElement,
                this.question,
                !!this.question.readOnly,
                this.drops,
            );
        }
    }

    /**
     * @inheritdoc
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
