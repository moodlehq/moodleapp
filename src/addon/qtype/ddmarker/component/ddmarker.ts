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

import { Component, OnInit, OnDestroy, Injector, ElementRef, ViewChild } from '@angular/core';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreQuestionBaseComponent } from '@core/question/classes/base-question-component';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { AddonQtypeDdMarkerQuestion } from '../classes/ddmarker';

/**
 * Component to render a drag-and-drop markers question.
 */
@Component({
    selector: 'addon-qtype-ddmarker',
    templateUrl: 'addon-qtype-ddmarker.html'
})
export class AddonQtypeDdMarkerComponent extends CoreQuestionBaseComponent implements OnInit, OnDestroy {
    @ViewChild('questiontext') questionTextEl: ElementRef;

    protected element: HTMLElement;
    protected questionInstance: AddonQtypeDdMarkerQuestion;
    protected dropZones: any[]; // The drop zones received in the init object of the question.
    protected imgSrc: string; // Background image URL.
    protected destroyed = false;
    protected textIsRendered = false;
    protected ddAreaisRendered = false;

    constructor(protected loggerProvider: CoreLoggerProvider, injector: Injector, element: ElementRef,
            protected sitesProvider: CoreSitesProvider, protected urlUtils: CoreUrlUtilsProvider,
            protected filepoolProvider: CoreFilepoolProvider) {
        super(loggerProvider, 'AddonQtypeDdMarkerComponent', injector);

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

        // Get D&D area, form and question text.
        const ddArea = element.querySelector('.ddarea'),
            ddForm = element.querySelector('.ddform');

        this.question.text = this.domUtils.getContentsOfElement(element, '.qtext');
        if (!ddArea || !ddForm || typeof this.question.text == 'undefined') {
            this.logger.warn('Aborting because of an error parsing question.', this.question.name);

            return this.questionHelper.showComponentError(this.onAbort);
        }

        // Build the D&D area HTML.
        this.question.ddArea = ddArea.outerHTML;

        const wrongParts = element.querySelector('.wrongparts');
        if (wrongParts) {
            this.question.ddArea += wrongParts.outerHTML;
        }
        this.question.ddArea += ddForm.outerHTML;
        this.question.readOnly = false;

        if (this.question.initObjects) {
            // Moodle version <= 3.5.
            if (typeof this.question.initObjects.dropzones != 'undefined') {
                this.dropZones = this.question.initObjects.dropzones;
            }
            if (typeof this.question.initObjects.readonly != 'undefined') {
                this.question.readOnly = this.question.initObjects.readonly;
            }
        } else if (this.question.amdArgs) {
            // Moodle version >= 3.6.
            let nextIndex = 1;
            // Moodle version >= 3.9, imgSrc is not specified, do not advance index.
            if (typeof this.question.amdArgs[nextIndex] != 'undefined' && typeof this.question.amdArgs[nextIndex] != 'boolean') {
                this.imgSrc = this.question.amdArgs[nextIndex];
                nextIndex++;
            }

            if (typeof this.question.amdArgs[nextIndex] != 'undefined') {
                this.question.readOnly = this.question.amdArgs[nextIndex];
            }
            nextIndex++;

            if (typeof this.question.amdArgs[nextIndex] != 'undefined') {
                this.dropZones = this.question.amdArgs[nextIndex];
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
    protected questionRendered(): void {
        if (!this.destroyed) {
            // Download background image (3.6+ sites).
            let promise = null;
            const site = this.sitesProvider.getCurrentSite();
            if (this.imgSrc && site.canDownloadFiles() && this.urlUtils.isPluginFileUrl(this.imgSrc)) {
                promise = this.filepoolProvider.getSrcByUrl(site.id, this.imgSrc, this.component, this.componentId, 0, true, true);
             } else {
                promise = Promise.resolve(this.imgSrc);
            }

            promise.then((imgSrc) => {
                this.domUtils.waitForImages(this.questionTextEl.nativeElement).then(() => {
                    // Create the instance.
                    this.questionInstance = new AddonQtypeDdMarkerQuestion(this.loggerProvider, this.domUtils, this.textUtils,
                            this.element, this.question, this.question.readOnly, this.dropZones, imgSrc);
                });
            });
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
