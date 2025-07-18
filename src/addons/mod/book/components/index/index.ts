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

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { AddonModBook, AddonModBookBookWSData, AddonModBookTocChapter } from '../../services/book';
import { CoreCourse } from '@features/course/services/course';
import { CoreNavigator } from '@services/navigator';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { ADDON_MOD_BOOK_MODNAME, ADDON_MOD_BOOK_PAGE_NAME, AddonModBookNumbering } from '../../constants';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';

/**
 * Component that displays a book entry page.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'addon-mod-book-index.html',
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModBookIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy {

    pluginName = ADDON_MOD_BOOK_MODNAME;
    showNumbers = true;
    addPadding = true;
    showBullets = false;
    chapters: AddonModBookTocChapter[] = [];
    hasStartedBook = false;

    protected book?: AddonModBookBookWSData;
    protected checkCompletionAfterLog = false;

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
    protected async fetchContent(): Promise<void> {
        await Promise.all([
            this.loadBook(),
            this.loadTOC(),
        ]);
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        await AddonModBook.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Load book data.
     *
     * @returns Promise resolved when done.
     */
    protected async loadBook(): Promise<void> {
        this.book = await AddonModBook.getBook(this.courseId, this.module.id);

        this.dataRetrieved.emit(this.book);

        this.description = this.book.intro;
        this.showNumbers = this.book.numbering === AddonModBookNumbering.NUMBERS;
        this.showBullets = this.book.numbering === AddonModBookNumbering.BULLETS;
        this.addPadding = this.book.numbering != AddonModBookNumbering.NONE;

        const lastChapterViewed = await AddonModBook.getLastChapterViewed(this.book.id);
        this.hasStartedBook = lastChapterViewed !== undefined;
    }

    /**
     * Load book TOC.
     *
     * @returns Promise resolved when done.
     */
    protected async loadTOC(): Promise<void> {
        const contents = await CoreCourse.getModuleContents(this.module, this.courseId);

        this.chapters = AddonModBook.getTocList(contents);
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        await CorePromiseUtils.ignoreErrors(AddonModBook.logView(this.module.instance));

        this.analyticsLogEvent('mod_book_view_book');
    }

    /**
     * Open the book in a certain chapter.
     *
     * @param chapterId Chapter to open, undefined for last chapter viewed.
     */
    async openBook(chapterId?: number): Promise<void> {
        await CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_BOOK_PAGE_NAME}/${this.courseId}/${this.module.id}/contents`,
            { params: { chapterId } },
        );

        this.hasStartedBook = true;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();
    }

}
