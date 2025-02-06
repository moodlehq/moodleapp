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
import { CoreSharedModule } from '@/core/shared.module';
import AddonModLessonPlayerPage from '../../pages/player/player';

/**
 * Modal that renders the lesson menu and media file.
 */
@Component({
    selector: 'page-addon-mod-lesson-menu-modal',
    templateUrl: 'menu-modal.html',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class AddonModLessonMenuModalPage {

    /**
     * The instance of the page that opened the modal. We use the instance instead of the needed attributes for these reasons:
     *     - We want the user to be able to see the media file while the menu is being loaded, so we need to be able to update
     *       the menu dynamically based on the data retrieved by the page that opened the modal.
     *     - The onDidDismiss function takes a while to be called, making the app seem slow. This way we can directly call
     *       the functions we need without having to wait for the modal to be dismissed.
     */
    @Input() pageInstance?: AddonModLessonPlayerPage;

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Load a certain page.
     *
     * @param pageId The page ID to load.
     */
    loadPage(pageId: number): void {
        this.pageInstance?.changePage(pageId);
        this.closeModal();
    }

}
