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

import { Component, Optional, OnInit, OnDestroy } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { AddonModBook, AddonModBookBookWSData, AddonModBookNumbering, AddonModBookTocChapter } from '../../services/book';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';

/**
 * Component that displays a book entry page.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'addon-mod-book-index.html',
})
export class AddonModBookIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy {

    showNumbers = true;
    addPadding = true;
    showBullets = false;
    chapters: AddonModBookTocChapter[] = [];

    protected book?: AddonModBookBookWSData;

    constructor( @Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModBookIndexComponent', courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.loadContent();
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean): Promise<void> {
        try {
            this.book = await AddonModBook.getBook(this.courseId, this.module.id);

            if (this.book) {
                this.dataRetrieved.emit(this.book);

                this.description = this.book.intro;
                this.showNumbers = this.book.numbering == AddonModBookNumbering.NUMBERS;
                this.showBullets = this.book.numbering == AddonModBookNumbering.BULLETS;
                this.addPadding = this.book.numbering != AddonModBookNumbering.NONE;
            }

            const contents = await CoreCourse.getModuleContents(this.module, this.courseId);

            this.chapters = AddonModBook.getTocList(contents);
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Open the book in a certain chapter.
     *
     * @param chapterId Chapter to open, undefined for first chapter.
     */
    openBook(chapterId?: number): void {
        CoreNavigator.navigate('contents', {
            params: {
                cmId: this.module.id,
                courseId: this.courseId,
                chapterId,
            },
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
    }

}
