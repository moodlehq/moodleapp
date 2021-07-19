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

import { Component, Input, OnInit } from '@angular/core';

import { ModalController, Translate } from '@singletons';

/**
 * Modal component to view an image.
 */
@Component({
    selector: 'core-viewer-image',
    templateUrl: 'image.html',
    styleUrls: ['image.scss'],
})
export class CoreViewerImageComponent implements OnInit {

    @Input() title?: string; // Modal title.
    @Input() image?: string; // Image URL.
    @Input() component?: string; // Component to use in external-content.
    @Input() componentId?: string | number; // Component ID to use in external-content.

    ngOnInit(): void {
        this.title = this.title || Translate.instant('core.imageviewer');
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
