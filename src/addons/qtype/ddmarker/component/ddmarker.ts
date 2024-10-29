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

import { Component, OnDestroy, ElementRef, ViewChild } from '@angular/core';

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
    styleUrl: 'ddmarker.scss',
})
export class AddonQtypeDdMarkerComponent
    extends CoreQuestionBaseComponent<AddonQtypeDdMarkerQuestionData>
    implements OnDestroy {

    @ViewChild('questiontext') questionTextEl?: ElementRef;

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
    init(): void {
        if (!this.question) {
            return;
        }

        const questionElement = this.initComponent();
        if (!questionElement) {
            return;
        }

        // Get D&D area, form and question text.
        const ddArea = questionElement.querySelector('.ddarea');
        const ddForm = questionElement.querySelector('.ddform');

        if (!ddArea || !ddForm) {
            this.logger.warn('Aborting because of an error parsing question.', this.question.slot);

            return CoreQuestionHelper.showComponentError(this.onAbort);
        }

        // Build the D&D area HTML.
        this.question.ddArea = ddArea.outerHTML;

        const wrongParts = questionElement.querySelector('.wrongparts');
        if (wrongParts) {
            this.question.ddArea += wrongParts.outerHTML;
        }
        this.question.ddArea += ddForm.outerHTML;
        this.question.readOnly = false;

        if (this.question.initObjects) {
            // Moodle version = 3.5.
            if (this.question.initObjects.dropzones !== undefined) {
                this.dropZones = <unknown[]> this.question.initObjects.dropzones;
            }
            if (this.question.initObjects.readonly !== undefined) {
                this.question.readOnly = !!this.question.initObjects.readonly;
            }
        } else if (this.question.amdArgs) {
            // Moodle version >= 3.6.
            let nextIndex = 1;
            // Moodle version >= 3.9, imgSrc is not specified, do not advance index.
            if (this.question.amdArgs[nextIndex] !== undefined && typeof this.question.amdArgs[nextIndex] !== 'boolean') {
                this.imgSrc = <string> this.question.amdArgs[nextIndex];
                nextIndex++;
            }

            if (this.question.amdArgs[nextIndex] !== undefined) {
                this.question.readOnly = !!this.question.amdArgs[nextIndex];
            }
            nextIndex++;

            if (this.question.amdArgs[nextIndex] !== undefined) {
                this.dropZones = <unknown[]> this.question.amdArgs[nextIndex];
            }
        }

        this.question.loaded = false;
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
        if (this.destroyed || !this.question) {
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
            this.question,
            !!this.question.readOnly,
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
