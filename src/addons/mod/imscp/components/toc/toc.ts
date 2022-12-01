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

import { Component, Input } from '@angular/core';
import { ModalController } from '@singletons';
import { AddonModImscpTocItem } from '../../services/imscp';

/**
 * Modal to display the TOC of a imscp.
 */
@Component({
    selector: 'addon-mod-imscp-toc',
    templateUrl: 'toc.html',
})
export class AddonModImscpTocComponent {

    @Input() items: AddonModImscpTocItem[] = [];
    @Input() selected?: string;

    /**
     * Function called when an item is clicked.
     *
     * @param id ID of the clicked item.
     */
    loadItem(id: string): void {
        ModalController.dismiss(id);
    }

    /**
     * Get dummy array for padding.
     *
     * @param n Array length.
     * @returns Dummy array with n elements.
     */
    getNumberForPadding(n: number): number[] {
        return new Array(n);
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
