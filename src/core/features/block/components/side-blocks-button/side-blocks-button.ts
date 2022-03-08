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

import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CoreUserTours, CoreUserToursAlignment, CoreUserToursSide } from '@features/usertours/services/user-tours';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreBlockSideBlocksTourComponent } from '../side-blocks-tour/side-blocks-tour';
import { CoreBlockSideBlocksComponent } from '../side-blocks/side-blocks';

/**
 * Component that displays a button to open blocks.
 */
@Component({
    selector: 'core-block-side-blocks-button',
    templateUrl: 'side-blocks-button.html',
    styleUrls: ['side-blocks-button.scss'],
})
export class CoreBlockSideBlocksButtonComponent {

    @Input() courseId!: number;
    @ViewChild('button', { read: ElementRef }) button?: ElementRef<HTMLElement>;

    /**
     * Open side blocks.
     */
    openBlocks(): void {
        CoreDomUtils.openSideModal({
            component: CoreBlockSideBlocksComponent,
            componentProps: {
                courseId: this.courseId,
            },
        });
    }

    /**
     * Show User Tour.
     */
    async showTour(): Promise<void> {
        const nativeButton = this.button?.nativeElement.shadowRoot?.children[0] as HTMLElement;

        if (!nativeButton) {
            return;
        }

        await CoreUserTours.showIfPending({
            id: 'side-blocks-button',
            component: CoreBlockSideBlocksTourComponent,
            focus: nativeButton,
            side: CoreUserToursSide.Start,
            alignment: CoreUserToursAlignment.Center,
        });
    }

}
