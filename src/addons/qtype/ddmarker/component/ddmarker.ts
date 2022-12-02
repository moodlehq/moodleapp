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

import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';

import { AddonModQuizQuestionBasicData, CoreQuestionBaseComponent } from '@features/question/classes/base-question-component';
import { CoreQuestionHelper } from '@features/question/services/question-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { AddonQtypeDdMarkerQuestion } from '../classes/ddmarker';

/**
 * Component to render a drag-and-drop markers question.
 */
@Component({
    selector: 'addon-qtype-ddmarker',
    templateUrl: 'addon-qtype-ddmarker.html',
    styleUrls: ['ddmarker.scss'],
})
export class AddonQtypeDdMarkerComponent extends CoreQuestionBaseComponent implements OnInit, OnDestroy {

    @ViewChild('questiontext') questionTextEl?: ElementRef;

    ddQuestion?: AddonQtypeDdMarkerQuestionData;

    protected questionInstance?: AddonQtypeDdMarkerQuestion;
    protected dropZones: unknown[] = []; // The drop zones received in the init object of the question.
    protected imgSrc?: string; // Background image URL.
    protected destroyed = false;
    protected textIsRendered = false;
    protected ddAreaisRendered = false;

    constructor(elementRef: ElementRef) {
        super('AddonQtypeDdMarkerComponent', elementRef);
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (!this.question) {
            this.logger.warn('Aborting because of no question received.');

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        this.ddQuestion = this.question;
        const element = CoreDomUtils.convertToElement(this.question.html);

        // Get D&D area, form and question text.
        const ddArea = element.querySelector('.ddarea');
        const ddForm = element.querySelector('.ddform');

        this.ddQuestion.text = CoreDomUtils.getContentsOfElement(element, '.qtext');
        if (!ddArea || !ddForm || this.ddQuestion.text === undefined) {
            this.logger.warn('Aborting because of an error parsing question.', this.ddQuestion.slot);

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        // Build the D&D area HTML.
        this.ddQuestion.ddArea = ddArea.outerHTML;

        const wrongParts = element.querySelector('.wrongparts');
        if (wrongParts) {
            this.ddQuestion.ddArea += wrongParts.outerHTML;
        }
        this.ddQuestion.ddArea += ddForm.outerHTML;
        this.ddQuestion.readOnly = false;

        if (this.ddQuestion.initObjects) {
            // Moodle version = 3.5.
            if (this.ddQuestion.initObjects.dropzones !== undefined) {
                this.dropZones = <unknown[]> this.ddQuestion.initObjects.dropzones;
            }
            if (this.ddQuestion.initObjects.readonly !== undefined) {
                this.ddQuestion.readOnly = !!this.ddQuestion.initObjects.readonly;
            }
        } else if (this.ddQuestion.amdArgs) {
            // Moodle version >= 3.6.
            let nextIndex = 1;
            // Moodle version >= 3.9, imgSrc is not specified, do not advance index.
            if (this.ddQuestion.amdArgs[nextIndex] !== undefined && typeof this.ddQuestion.amdArgs[nextIndex] != 'boolean') {
                this.imgSrc = <string> this.ddQuestion.amdArgs[nextIndex];
                nextIndex++;
            }

            if (this.ddQuestion.amdArgs[nextIndex] !== undefined) {
                this.ddQuestion.readOnly = !!this.ddQuestion.amdArgs[nextIndex];
            }
            nextIndex++;

            if (this.ddQuestion.amdArgs[nextIndex] !== undefined) {
                this.dropZones = <unknown[]> this.ddQuestion.amdArgs[nextIndex];
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
    protected async questionRendered(): Promise<void> {
        if (this.destroyed) {
            return;
        }
        // Download background image (3.6+ sites).
        let imgSrc = this.imgSrc;
        const site = CoreSites.getCurrentSite();

        if (this.imgSrc && site?.canDownloadFiles() && site.isSitePluginFileUrl(this.imgSrc)) {
            imgSrc = await CoreFilepool.getSrcByUrl(
                site.getId(),
                this.imgSrc,
                this.component,
                this.componentId,
                0,
                true,
                true,
            );
        }

        if (this.questionTextEl) {
            await CoreDomUtils.waitForImages(this.questionTextEl.nativeElement);
        }

        // Create the instance.
        this.questionInstance = new AddonQtypeDdMarkerQuestion(
            this.hostElement,
            this.ddQuestion!,
            !!this.ddQuestion!.readOnly,
            this.dropZones,
            imgSrc,
        );
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
 * Data for DD Marker question.
 */
export type AddonQtypeDdMarkerQuestionData = AddonModQuizQuestionBasicData & {
    loaded?: boolean;
    readOnly?: boolean;
    ddArea?: string;
};
