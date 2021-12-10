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
import { CoreNavigationBarItem } from '@components/navigation-bar/navigation-bar';
import { CoreError } from '@classes/errors/error';
import { Translate } from '@singletons';
import { CoreSwipeCurrentItemData, CoreSwipeSlidesComponent, CoreSwipeSlidesOptions } from '@components/swipe-slides/swipe-slides';
import { CoreSwipeSlidesItemsManagerSource } from '@classes/items-management/slides-items-manager-source';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreSwipeSlidesItemsManager } from '@classes/items-management/slides-items-manager';

/**
 * Component that displays a book.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'addon-mod-book-index.html',
})
export class AddonModBookIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    @ViewChild(CoreSwipeSlidesComponent) slides?: CoreSwipeSlidesComponent;

    @Input() initialChapterId?: number; // The initial chapter ID to load.

    component = AddonModBookProvider.COMPONENT;
    manager?: CoreSwipeSlidesItemsManager<LoadedChapter, AddonModBookSlidesItemsManagerSource>;
    previousChapter?: AddonModBookTocChapter;
    nextChapter?: AddonModBookTocChapter;
    tagsEnabled = false;
    warning = '';
    displayNavBar = true;
    navigationItems: CoreNavigationBarItem<AddonModBookTocChapter>[] = [];
    displayTitlesInNavBar = false;
    slidesOpts: CoreSwipeSlidesOptions = {
        autoHeight: true,
        scrollOnChange: 'top',
    };

    protected currentChapter?: number;
    protected element: HTMLElement;

    constructor(
        elementRef: ElementRef,
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
        const source = new AddonModBookSlidesItemsManagerSource(
            this.courseId,
            this.module,
            this.tagsEnabled,
            this.initialChapterId,
        );
        this.manager = new CoreSwipeSlidesItemsManager(source);

        this.loadContent();
    }

    get book(): AddonModBookBookWSData | undefined {
        return this.manager?.getSource().book;
    }

    get chapters(): AddonModBookTocChapter[] {
        return this.manager?.getSource().chapters || [];
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

        this.slides?.slideToItem({ id: chapterId });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        await this.manager?.getSource().invalidateContent();
    }

    /**
     * Download book contents and load the current chapter.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    protected async fetchContent(refresh = false): Promise<void> {
        try {
            const source = this.manager?.getSource();
            if (!source) {
                return;
            }

            const downloadResult = await this.downloadResourceIfNeeded(refresh);

            const book = await source.loadBookData();

            if (book) {
                this.dataRetrieved.emit(book);

                this.description = book.intro;
                this.displayNavBar = book.navstyle != AddonModBookNavStyle.TOC_ONLY;
                this.displayTitlesInNavBar = book.navstyle == AddonModBookNavStyle.TEXT;
            }

            // Get contents. No need to refresh, it has been done in downloadResourceIfNeeded.
            await source.loadContents();

            await source.load();

            this.warning = downloadResult?.failed ? this.getErrorDownloadingSomeFilesMessage(downloadResult.error || '') : '';
        } finally {
            // Pass false because downloadResourceIfNeeded already invalidates and refresh data if refresh=true.
            this.fillContextMenu(false);
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
     * @param data Data about new item.
     */
    slideChanged(data: CoreSwipeCurrentItemData<LoadedChapter>): void {
        this.viewChapter(data.item.id, true);
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

/**
 * Helper to manage swiping within a collection of chapters.
 */
class AddonModBookSlidesItemsManagerSource extends CoreSwipeSlidesItemsManagerSource<LoadedChapter> {

    readonly COURSE_ID: number;
    readonly MODULE: CoreCourseModule;
    readonly TAGS_ENABLED: boolean;

    book?: AddonModBookBookWSData;
    chapters: AddonModBookTocChapter[] = [];
    contentsMap: AddonModBookContentsMap = {};

    constructor(courseId: number, module: CoreCourseModule, tagsEnabled: boolean, initialChapterId?: number) {
        super(initialChapterId ? { id: initialChapterId } : undefined);

        this.COURSE_ID = courseId;
        this.MODULE = module;
        this.TAGS_ENABLED = tagsEnabled;
    }

    /**
     * @inheritdoc
     */
    getItemId(item: LoadedChapter): string | number {
        return item.id;
    }

    /**
     * Load book data from WS.
     *
     * @return Promise resolved when done.
     */
    async loadBookData(): Promise<AddonModBookBookWSData> {
        this.book = await AddonModBook.getBook(this.COURSE_ID, this.MODULE.id);

        return this.book;
    }

    /**
     * Load module contents.
     */
    async loadContents(): Promise<void> {
        // Get contents. No need to refresh, it has been done in downloadResourceIfNeeded.
        const contents = await CoreCourse.getModuleContents(this.MODULE, this.COURSE_ID);

        this.contentsMap = AddonModBook.getContentsMap(contents);
        this.chapters = AddonModBook.getTocList(contents);
    }

    /**
     * @inheritdoc
     */
    protected async loadItems(): Promise<LoadedChapter[]> {
        try {
            const newChapters = await Promise.all(this.chapters.map(async (chapter) => {
                const content = await AddonModBook.getChapterContent(this.contentsMap, chapter.id, this.MODULE.id);

                return {
                    id: chapter.id,
                    content,
                    tags: this.TAGS_ENABLED ? this.contentsMap[chapter.id].tags : [],
                };
            }));

            return newChapters;
        } catch (exception) {
            const error = exception ?? new CoreError(Translate.instant('addon.mod_book.errorchapter'));
            if (!error.message) {
                error.message = Translate.instant('addon.mod_book.errorchapter');
            }

            throw error;
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    invalidateContent(): Promise<void> {
        return AddonModBook.invalidateContent(this.MODULE.id, this.COURSE_ID);
    }

}
