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

import { Component, Optional, Input, OnInit, ViewChild, ElementRef } from '@angular/core';
import { IonContent, IonSlides } from '@ionic/angular';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
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
import { CoreUtils } from '@services/utils/utils';
import { CoreCourse } from '@features/course/services/course';
import { AddonModBookTocComponent } from '../toc/toc';
import { CoreConstants } from '@/core/constants';
import { CoreNavigationBarItem } from '@components/navigation-bar/navigation-bar';
import { CoreError } from '@classes/errors/error';
import { Translate } from '@singletons';

/**
 * Component that displays a book.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'addon-mod-book-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModBookIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    @ViewChild(IonSlides) slides?: IonSlides;

    @Input() initialChapterId?: number; // The initial chapter ID to load.

    component = AddonModBookProvider.COMPONENT;
    loadedChapters: LoadedChapter[] = [];
    previousChapter?: AddonModBookTocChapter;
    nextChapter?: AddonModBookTocChapter;
    tagsEnabled = false;
    warning = '';
    tags?: CoreTagItem[];
    displayNavBar = true;
    navigationItems: CoreNavigationBarItem<AddonModBookTocChapter>[] = [];
    displayTitlesInNavBar = false;
    slidesOpts = {
        initialSlide: 0,
        autoHeight: true,
    };

    protected chapters: AddonModBookTocChapter[] = [];
    protected currentChapter?: number;
    protected book?: AddonModBookBookWSData;
    protected contentsMap: AddonModBookContentsMap = {};
    protected element: HTMLElement;

    constructor(
        elementRef: ElementRef,
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModBookIndexComponent', courseContentsPage);

        this.element = elementRef.nativeElement;
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
        if (!chapterId || chapterId === this.currentChapter) {
            return;
        }

        const index = this.loadedChapters.findIndex(chapter => chapter.id === chapterId);
        if (index > -1) {
            this.slides?.slideTo(index);
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
        try {
            const downloadResult = await this.downloadResourceIfNeeded(refresh);

            await this.loadBookData();

            // Get contents. No need to refresh, it has been done in downloadResourceIfNeeded.
            const contents = await CoreCourse.getModuleContents(this.module, this.courseId);

            this.contentsMap = AddonModBook.getContentsMap(contents);
            this.chapters = AddonModBook.getTocList(contents);

            if (typeof this.currentChapter == 'undefined' && typeof this.initialChapterId != 'undefined' && this.chapters) {
                // Initial chapter set. Validate that the chapter exists.
                const index = this.chapters.findIndex((chapter) => chapter.id == this.initialChapterId);

                if (index >= 0) {
                    this.currentChapter = this.initialChapterId;
                    this.slidesOpts.initialSlide = index;
                }
            }

            if (this.currentChapter === undefined) {
                // Load the first chapter.
                this.currentChapter = AddonModBook.getFirstChapter(this.chapters);
            }

            if (this.currentChapter === undefined) {
                return;
            }

            await this.loadChapters();

            // Show chapter.
            await this.viewChapter(this.currentChapter, refresh);

            this.warning = downloadResult?.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error!) : '';
        } finally {
            // Pass false because downloadResourceIfNeeded already invalidates and refresh data if refresh=true.
            this.fillContextMenu(false);
        }
    }

    /**
     * Load book data from WS.
     *
     * @return Promise resolved when done.
     */
    protected async loadBookData(): Promise<void> {
        this.book = await AddonModBook.getBook(this.courseId, this.module.id);

        this.dataRetrieved.emit(this.book);

        this.description = this.book.intro;
        this.displayNavBar = this.book.navstyle != AddonModBookNavStyle.TOC_ONLY;
        this.displayTitlesInNavBar = this.book.navstyle == AddonModBookNavStyle.TEXT;
    }

    /**
     * Load book chapters.
     *
     * @return Promise resolved when done.
     */
    protected async loadChapters(): Promise<void> {
        try {
            const newChapters = await Promise.all(this.chapters.map(async (chapter) => {
                const content = await AddonModBook.getChapterContent(this.contentsMap, chapter.id, this.module.id);

                return {
                    id: chapter.id,
                    content,
                    tags: this.tagsEnabled ? this.contentsMap[chapter.id].tags : [],
                };
            }));

            let newIndex = -1;
            if (this.loadedChapters.length && newChapters.length != this.loadedChapters.length) {
                // Number of chapters has changed. Search the chapter to display, otherwise it could change automatically.
                newIndex = this.chapters.findIndex((chapter) => chapter.id === this.currentChapter);
            }

            this.loadedChapters = newChapters;

            if (newIndex > -1) {
                this.slides?.slideTo(newIndex, 0, false);
            }
        } catch (exception) {
            const error = exception ?? new CoreError(Translate.instant('addon.mod_book.errorchapter'));
            if (!error.message) {
                error.message = Translate.instant('addon.mod_book.errorchapter');
            }

            throw error;
        }
    }

    /**
     * View a book chapter.
     *
     * @param chapterId Chapter to load.
     * @param logChapterId Whether chapter ID should be passed to the log view function.
     * @return Promise resolved when done.
     */
    protected async viewChapter(chapterId: number, logChapterId: boolean): Promise<void> {
        this.currentChapter = chapterId;

        if (this.displayNavBar) {
            this.navigationItems = this.getNavigationItems(chapterId);
        }

        // Chapter loaded, log view.
        await CoreUtils.ignoreErrors(AddonModBook.logView(
            this.module.instance!,
            logChapterId ? chapterId : undefined,
            this.module.name,
        ));

        const currentChapterIndex = this.chapters.findIndex((chapter) => chapter.id == chapterId);
        const isLastChapter = currentChapterIndex < 0 || this.chapters[currentChapterIndex + 1] === undefined;

        // Module is completed when last chapter is viewed, so we only check completion if the last is reached.
        if (isLastChapter) {
            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
        }
    }

    /**
     * Slide has changed.
     *
     * @return Promise resolved when done.
     */
    async slideChanged(): Promise<void> {
        if (!this.slides) {
            return;
        }

        const scrollElement = await this.content?.getScrollElement();
        const container = this.element.querySelector<HTMLElement>('.addon-mod_book-container');

        if (container && (!scrollElement || CoreDomUtils.isElementOutsideOfScreen(scrollElement, container, 'top'))) {
            // Scroll to top.
            container.scrollIntoView({ behavior: 'smooth' });
        }

        const index = await this.slides.getActiveIndex();

        this.viewChapter(this.loadedChapters[index].id, true);
    }

    /**
     * Converts chapters to navigation items.
     *
     * @param chapterId Current chapter Id.
     * @return Navigation items.
     */
    protected getNavigationItems(chapterId: number): CoreNavigationBarItem<AddonModBookTocChapter>[] {
        return this.chapters.map((chapter) => ({
            item: chapter,
            title: chapter.title,
            current: chapter.id == chapterId,
            enabled: true,
        }));
    }

}

type LoadedChapter = {
    id: number;
    content: string;
    tags?: CoreTagItem[];
};
