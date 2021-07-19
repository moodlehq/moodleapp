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
import { ModalController } from '@singletons';
import { AddonModBookTocChapter, AddonModBookBookWSData, AddonModBookNumbering } from '../../services/book';

/**
 * Modal to display the TOC of a book.
 */
@Component({
    selector: 'addon-mod-book-toc',
    templateUrl: 'toc.html',
    styleUrls: ['toc.scss'],
})
export class AddonModBookTocComponent implements OnInit {

    @Input() moduleId?: number;
    @Input() chapters: AddonModBookTocChapter[] = [];
    @Input() selected?: number;
    @Input() courseId?: number;
    showNumbers = true;
    addPadding = true;
    showBullets = false;

    @Input() protected book?: AddonModBookBookWSData;

    /**
     * Component loaded.
     */
    ngOnInit(): void {
        if (this.book) {
            this.showNumbers = this.book.numbering == AddonModBookNumbering.NUMBERS;
            this.showBullets = this.book.numbering == AddonModBookNumbering.BULLETS;
            this.addPadding = this.book.numbering != AddonModBookNumbering.NONE;
        }
    }

    /**
     * Function called when a course is clicked.
     *
     * @param id ID of the clicked chapter.
     */
    loadChapter(id: number): void {
        ModalController.dismiss(id);
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
