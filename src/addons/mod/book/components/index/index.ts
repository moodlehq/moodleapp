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

import { Component, Optional, Input, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
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
import { CoreSwipeSlidesComponent, CoreSwipeSlidesOptions } from '@components/swipe-slides/swipe-slides';
import { CoreSwipeSlidesItemsManagerSource } from '@classes/items-management/swipe-slides-items-manager-source';
import { CoreCourseModule } from '@features/course/services/course-helper';
import { CoreSwipeSlidesItemsManager } from '@classes/items-management/swipe-slides-items-manager';
import { CoreTextUtils } from '@services/utils/text';

/**
 * Component that displays a book.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'addon-mod-book-index.html',
})
export class AddonModBookIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit, OnDestroy {

    @ViewChild(CoreSwipeSlidesComponent) slides?: CoreSwipeSlidesComponent;

    @Input() initialChapterId?: number; // The initial chapter ID to load.

    component = AddonModBookProvider.COMPONENT;
    manager?: CoreSwipeSlidesItemsManager<LoadedChapter, AddonModBookSlidesItemsManagerSource>;
    warning = '';
    displayNavBar = true;
    navigationItems: CoreNavigationBarItem<AddonModBookTocChapter>[] = [];
    displayTitlesInNavBar = false;
    slidesOpts: CoreSwipeSlidesOptions = {
        autoHeight: true,
        scrollOnChange: 'top',
    };

    protected firstLoad = true;
    protected element: HTMLElement;
    protected managerUnsubscribe?: () => void;

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

        const source = new AddonModBookSlidesItemsManagerSource(
            this.courseId,
            this.module,
            CoreTag.areTagsAvailableInSite(),
            this.initialChapterId,
        );
        this.manager = new CoreSwipeSlidesItemsManager(source);
        this.managerUnsubscribe = this.manager.addListener({
            onSelectedItemUpdated: (item) => {
                this.onChapterViewed(item.id);
            },
        });

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
        const visibleChapter = this.manager?.getSelectedItem();

        const modalData = await CoreDomUtils.openSideModal<number>({
            component: AddonModBookTocComponent,
            componentProps: {
                moduleId: this.module.id,
                chapters: this.chapters,
                selected: visibleChapter,
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
        if (!chapterId) {
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
     * Update data related to chapter being viewed.
     *
     * @param chapterId Chapter viewed.
     * @return Promise resolved when done.
     */
    protected async onChapterViewed(chapterId: number): Promise<void> {
        // Don't log the chapter ID when the user has just opened the book.
        const logChapterId = this.firstLoad;
        this.firstLoad = false;

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

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.managerUnsubscribe && this.managerUnsubscribe();
    }

}

type LoadedChapter = {
    id: number;
    content?: string;
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
        } catch (error) {
            if (!CoreTextUtils.getErrorMessageFromError(error)) {
                throw new CoreError(Translate.instant('addon.mod_book.errorchapter'));
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
