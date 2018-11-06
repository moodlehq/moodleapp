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

import { Directive, Input, OnInit, ElementRef } from '@angular/core';
import { CoreFileHelperProvider } from '@providers/file-helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';

/**
 * Directive to allow downloading and open a file. When the item with this directive is clicked, the file will be
 * downloaded (if needed) and opened.
 */
@Directive({
    selector: '[core-download-file]'
})
export class CoreDownloadFileDirective implements OnInit {
    @Input('core-download-file') file: any; // The file to download.
    @Input() component?: string; // Component to link the file to.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.

    protected element: HTMLElement;

    constructor(element: ElementRef, protected domUtils: CoreDomUtilsProvider, protected fileHelper: CoreFileHelperProvider) {
        this.element = element.nativeElement || element;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (ev: Event): void => {
            if (!this.file) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();

            const modal = this.domUtils.showModalLoading();

            this.fileHelper.downloadAndOpenFile(this.file, this.component, this.componentId).catch((error) => {
                this.domUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            }).finally(() => {
                modal.dismiss();
            });
        });
    }
}
