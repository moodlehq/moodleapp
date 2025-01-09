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

import { Directive, Input, OnInit, ElementRef } from '@angular/core';
import { CoreFileHelper } from '@services/file-helper';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreWSFile } from '@services/ws';

/**
 * Directive to allow downloading and open a file. When the item with this directive is clicked, the file will be
 * downloaded (if needed) and opened.
 */
@Directive({
    selector: '[core-download-file]',
})
export class CoreDownloadFileDirective implements OnInit {

    @Input('core-download-file') file?: CoreWSFile; // The file to download.
    @Input() component?: string; // Component to link the file to.
    @Input() componentId?: string | number; // Component ID to use in conjunction with the component.

    protected element: HTMLElement;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.element.addEventListener('click', async (ev: Event) => {
            if (!this.file) {
                return;
            }

            ev.preventDefault();
            ev.stopPropagation();

            const modal = await CoreLoadings.show();

            try {
                await CoreFileHelper.downloadAndOpenFile(this.file, this.component, this.componentId);
            } catch (error) {
                CoreDomUtils.showErrorModalDefault(error, 'core.errordownloading', true);
            } finally {
                modal.dismiss();
            }
        });
    }

}
