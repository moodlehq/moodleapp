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

import { Component, Optional, Input, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular';
import {
    CoreCourseModuleMainResourceComponent, CoreCourseResourceDownloadResult,
} from '@features/course/classes/main-resource-component';
import {
    AddonModBookProvider,
    AddonModBookContentsMap,
    AddonModBookTocChapter,
    AddonModBookNavStyle,
    AddonModBook,
    AddonModBookBookWSData,
} from '../../services/book';
import { CoreTag, CoreTagItem } from '@features/tag/services/tag';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { Translate } from '@singletons';
import { CoreUtils } from '@services/utils/utils';
import { CoreCourse } from '@features/course/services/course';
import { AddonModBookTocComponent } from '../toc/toc';
import { CoreConstants } from '@/core/constants';

/**
 * Component that displays a book.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'addon-mod-book-index.html',
})
export class AddonModBookIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    @Input() initialChapterId?: number; // The initial chapter ID to load.

    component = AddonModBookProvider.COMPONENT;
    chapterContent?: string;
    previousChapter?: AddonModBookTocChapter;
    nextChapter?: AddonModBookTocChapter;
    tagsEnabled = false;
    displayNavBar = true;
    previousNavBarTitle?: string;
    nextNavBarTitle?: string;
    warning = '';
    tags?: CoreTagItem[];

    protected chapters: AddonModBookTocChapter[] = [];
    protected currentChapter?: number;
    protected book?: AddonModBookBookWSData;
    protected displayTitlesInNavBar = false;
    protected contentsMap: AddonModBookContentsMap = {};

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModBookIndexComponent', courseContentsPage);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.tagsEnabled = CoreTag.areTagsAvailableInSite();
        this.loadContent();
    }

    /**
     * Show the TOC.
     */
    async showToc(): Promise<void> {
        // Create the toc modal.
        const modalData = await CoreDomUtils.openSideModal<number>({
            component: AddonModBookTocComponent,
            componentProps: {
                moduleId: this.module.id,
                chapters: this.chapters,
                selected: this.currentChapter,
                courseId: this.courseId,
                book: this.book,
            },
        });

        if (modalData) {
            this.changeChapter(modalData);
        }
    }

    /**
     * Change the current chapter.
     *
     * @param chapterId Chapter to load.
     * @return Promise resolved when done.
     */
    changeChapter(chapterId: number): void {
        if (chapterId && chapterId != this.currentChapter) {
            this.loaded = false;
            this.refreshIcon = CoreConstants.ICON_LOADING;
            this.loadChapter(chapterId, true);
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected invalidateContent(): Promise<void> {
        return AddonModBook.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download book contents and load the current chapter.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh = false): Promise<void> {
        const promises: Promise<void>[] = [];
        let downloadResult: CoreCourseResourceDownloadResult | undefined;

        // Try to get the book data. Ignore errors since this WS isn't available in some Moodle versions.
        promises.push(CoreUtils.ignoreErrors(AddonModBook.getBook(this.courseId, this.module.id))
            .then((book) => {
                if (!book) {
                    return;
                }

                this.book = book;
                this.dataRetrieved.emit(book);

                this.description = book.intro;
                this.displayNavBar = book.navstyle != AddonModBookNavStyle.TOC_ONLY;
                this.displayTitlesInNavBar = book.navstyle == AddonModBookNavStyle.TEXT;

                return;
            }));

        // Get module status to determine if it needs to be downloaded.
        promises.push(this.downloadResourceIfNeeded(refresh).then((result) => {
            downloadResult = result;

            return;
        }));

        try {
            await Promise.all(promises);

            this.contentsMap = AddonModBook.getContentsMap(this.module.contents);
            this.chapters = AddonModBook.getTocList(this.module.contents);

            if (typeof this.currentChapter == 'undefined' && typeof this.initialChapterId != 'undefined' && this.chapters) {
                // Initial chapter set. Validate that the chapter exists.
                const chapter = this.chapters.find((chapter) => chapter.id == this.initialChapterId);

                if (chapter) {
                    this.currentChapter = this.initialChapterId;
                }
            }

            if (typeof this.currentChapter == 'undefined') {
                // Load the first chapter.
                this.currentChapter = AddonModBook.getFirstChapter(this.chapters);
            }

            // Show chapter.
            try {
                await this.loadChapter(this.currentChapter!, refresh);

                this.warning = downloadResult?.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error!) : '';
            } catch {
                // Ignore errors, they're handled inside the loadChapter function.
            }
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Load a book chapter.
     *
     * @param chapterId Chapter to load.
     * @param logChapterId Whether chapter ID should be passed to the log view function.
     * @return Promise resolved when done.
     */
    protected async loadChapter(chapterId: number, logChapterId: boolean): Promise<void> {
        this.currentChapter = chapterId;
        this.content?.scrollToTop();

        try {
            const content = await AddonModBook.getChapterContent(this.contentsMap, chapterId, this.module.id);

            this.tags = this.tagsEnabled ? this.contentsMap[this.currentChapter].tags : [];

            this.chapterContent = content;
            this.previousChapter = AddonModBook.getPreviousChapter(this.chapters, chapterId);
            this.nextChapter = AddonModBook.getNextChapter(this.chapters, chapterId);

            this.previousNavBarTitle = this.previousChapter && this.displayTitlesInNavBar
                ? Translate.instant('addon.mod_book.navprevtitle', { $a: this.previousChapter.title })
                : '';
            this.nextNavBarTitle = this.nextChapter && this.displayTitlesInNavBar
                ? Translate.instant('addon.mod_book.navnexttitle', { $a: this.nextChapter.title })
                : '';

            // Chapter loaded, log view. We don't return the promise because we don't want to block the user for this.
            await CoreUtils.ignoreErrors(AddonModBook.logView(
                this.module.instance!,
                logChapterId ? chapterId : undefined,
                this.module.name,
            ));

            // Module is completed when last chapter is viewed, so we only check completion if the last is reached.
            if (!this.nextChapter) {
                CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_book.errorchapter', true);

            throw error;
        } finally {
            this.loaded = true;
            this.refreshIcon = CoreConstants.ICON_REFRESH;
        }
    }

}
