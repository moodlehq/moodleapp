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

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChange } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreCourseProvider } from '../../providers/course';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';

/**
 * Component to handle activity completion. It shows a checkbox with the current status, and allows manually changing
 * the completion if it's allowed.
 *
 * Example usage:
 *
 * <core-course-module-completion [completion]="module.completiondata" [moduleName]="module.name"
 *     (completionChanged)="completionChanged()"></core-course-module-completion>
 */
@Component({
    selector: 'core-course-module-completion',
    templateUrl: 'core-course-module-completion.html'
})
export class CoreCourseModuleCompletionComponent implements OnChanges {
    @Input() completion: any; // The completion status.
    @Input() moduleId?: number; // The name of the module this completion affects.
    @Input() moduleName?: string; // The name of the module this completion affects.
    @Output() completionChanged?: EventEmitter<any>; // Will emit an event when the completion changes.

    completionImage: string;
    completionDescription: string;

    constructor(private filterHelper: CoreFilterHelperProvider, private domUtils: CoreDomUtilsProvider,
            private translate: TranslateService, private courseProvider: CoreCourseProvider,
            private userProvider: CoreUserProvider) {
        this.completionChanged = new EventEmitter();
    }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.completion && this.completion) {
            this.showStatus();
        }
    }

    /**
     * Completion clicked.
     *
     * @param e The click event.
     */
    completionClicked(e: Event): void {
        if (this.completion) {
            if (typeof this.completion.cmid == 'undefined' || this.completion.tracking !== 1) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const modal = this.domUtils.showModalLoading();

            this.completion.state = this.completion.state === 1 ? 0 : 1;
            this.courseProvider.markCompletedManually(this.completion.cmid, this.completion.state,
                    this.completion.courseId, this.completion.courseName).then((response) => {

                if (!response.status) {
                    return Promise.reject(null);
                }

                if (this.completion.hasOwnProperty('valueused') && !this.completion.valueused) {
                    this.showStatus();
                    if (response.offline) {
                        this.completion.offline = true;
                    }
                }
                this.completionChanged.emit(this.completion);
            }).catch((error) => {
                this.completion.state = this.completion.state === 1 ? 0 : 1;
                this.domUtils.showErrorModalDefault(error, 'core.errorchangecompletion', true);
            }).finally(() => {
                modal.dismiss();
            });
        }
    }

    /**
     * Set image and description to show as completion icon.
     */
    protected showStatus(): void {
        const moduleName = this.moduleName || '';
        let langKey,
            image;

        if (this.completion.tracking === CoreCourseProvider.COMPLETION_TRACKING_MANUAL &&
                this.completion.state === CoreCourseProvider.COMPLETION_INCOMPLETE) {
            image = 'completion-manual-n';
            langKey = 'core.completion-alt-manual-n';
        } else if (this.completion.tracking === CoreCourseProvider.COMPLETION_TRACKING_MANUAL &&
                this.completion.state === CoreCourseProvider.COMPLETION_COMPLETE) {
            image = 'completion-manual-y';
            langKey = 'core.completion-alt-manual-y';
        } else if (this.completion.tracking === CoreCourseProvider.COMPLETION_TRACKING_AUTOMATIC &&
                this.completion.state === CoreCourseProvider.COMPLETION_INCOMPLETE) {
            image = 'completion-auto-n';
            langKey = 'core.completion-alt-auto-n';
        } else if (this.completion.tracking === CoreCourseProvider.COMPLETION_TRACKING_AUTOMATIC &&
                this.completion.state === CoreCourseProvider.COMPLETION_COMPLETE) {
            image = 'completion-auto-y';
            langKey = 'core.completion-alt-auto-y';
        } else if (this.completion.tracking === CoreCourseProvider.COMPLETION_TRACKING_AUTOMATIC &&
                this.completion.state === CoreCourseProvider.COMPLETION_COMPLETE_PASS) {
            image = 'completion-auto-pass';
            langKey = 'core.completion-alt-auto-pass';
        } else if (this.completion.tracking === CoreCourseProvider.COMPLETION_TRACKING_AUTOMATIC &&
                this.completion.state === CoreCourseProvider.COMPLETION_COMPLETE_FAIL) {
            image = 'completion-auto-fail';
            langKey = 'core.completion-alt-auto-fail';
        }

        if (image) {
            if (this.completion.overrideby > 0) {
                image += '-override';
            }
            this.completionImage = 'assets/img/completion/' + image + '.svg';
        }

        if (moduleName) {
            this.filterHelper.getFiltersAndFormatText(moduleName, 'module', this.moduleId,
                    {clean: true, singleLine: true, shortenLength: 50, courseId: this.completion.courseId}).then((result) => {

                let promise;

                if (this.completion.overrideby > 0) {
                    langKey += '-override';

                    promise = this.userProvider.getProfile(this.completion.overrideby, this.completion.courseId, true).then(
                        (profile) => {
                            return {
                                overrideuser: profile.fullname,
                                modname: result.text
                            };
                        });
                } else {
                    promise = Promise.resolve(result.text);
                }

                return promise.then((translateParams) => {
                    this.completionDescription = this.translate.instant(langKey, { $a: translateParams });
                });
            });
        }
    }
}
