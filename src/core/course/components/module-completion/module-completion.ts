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

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChange } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUserProvider } from '@core/user/providers/user';

/**
 * Component to handle activity completion. It shows a checkbox with the current status, and allows manually changing
 * the completion if it's allowed.
 *
 * Example usage:
 *
 * <core-course-module-completion [completion]="module.completionstatus" [moduleName]="module.name"
 *     (completionChanged)="completionChanged()"></core-course-module-completion>
 */
@Component({
    selector: 'core-course-module-completion',
    templateUrl: 'core-course-module-completion.html'
})
export class CoreCourseModuleCompletionComponent implements OnChanges {
    @Input() completion: any; // The completion status.
    @Input() moduleName?: string; // The name of the module this completion affects.
    @Output() completionChanged?: EventEmitter<void>; // Will emit an event when the completion changes.

    completionImage: string;
    completionDescription: string;

    constructor(private textUtils: CoreTextUtilsProvider, private domUtils: CoreDomUtilsProvider,
            private translate: TranslateService, private sitesProvider: CoreSitesProvider, private userProvider: CoreUserProvider) {
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
     * @param {Event} e The click event.
     */
    completionClicked(e: Event): void {
        if (this.completion) {
            if (typeof this.completion.cmid == 'undefined' || this.completion.tracking !== 1) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const modal = this.domUtils.showModalLoading(),
                params = {
                    cmid: this.completion.cmid,
                    completed: this.completion.state === 1 ? 0 : 1
                },
                currentSite = this.sitesProvider.getCurrentSite();

            currentSite.write('core_completion_update_activity_completion_status_manually', params).then((response) => {
                if (!response.status) {
                    return Promise.reject(null);
                }

                this.completionChanged.emit();
            }).catch((error) => {
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

        if (this.completion.tracking === 1 && this.completion.state === 0) {
            image = 'completion-manual-n';
            langKey = 'core.completion-alt-manual-n';
        } else if (this.completion.tracking === 1 && this.completion.state === 1) {
            image = 'completion-manual-y';
            langKey = 'core.completion-alt-manual-y';
        } else if (this.completion.tracking === 2 && this.completion.state === 0) {
            image = 'completion-auto-n';
            langKey = 'core.completion-alt-auto-n';
        } else if (this.completion.tracking === 2 && this.completion.state === 1) {
            image = 'completion-auto-y';
            langKey = 'core.completion-alt-auto-y';
        } else if (this.completion.tracking === 2 && this.completion.state === 2) {
            image = 'completion-auto-pass';
            langKey = 'core.completion-alt-auto-pass';
        } else if (this.completion.tracking === 2 && this.completion.state === 3) {
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
            this.textUtils.formatText(moduleName, true, true, 50).then((modNameFormatted) => {
                let promise;

                if (this.completion.overrideby > 0) {
                    langKey += '-override';

                    promise = this.userProvider.getProfile(this.completion.overrideby, this.completion.courseId, true).then(
                        (profile) => {
                            return {
                                overrideuser: profile.fullname,
                                modname: modNameFormatted
                            };
                        });
                } else {
                    promise = Promise.resolve(modNameFormatted);
                }

                return promise.then((translateParams) => {
                    this.completionDescription = this.translate.instant(langKey, { $a: translateParams });
                });
            });
        }
    }
}
