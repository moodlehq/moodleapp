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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreSwipeSlidesItemsManager } from '@classes/items-management/swipe-slides-items-manager';
import { CoreSwipeSlidesItemsManagerSource } from '@classes/items-management/swipe-slides-items-manager-source';
import { CoreNavigationBarItem } from '@components/navigation-bar/navigation-bar';
import { CoreSwipeSlidesComponent, CoreSwipeSlidesOptions } from '@components/swipe-slides/swipe-slides';
import { CoreCourse, CoreCourseModuleContentFile } from '@features/course/services/course';
import { CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreTag, CoreTagItem } from '@features/tag/services/tag';
import { CoreNetwork } from '@services/network';
import { CoreNavigator } from '@services/navigator';
import { CoreErrorHelper } from '@services/error-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate } from '@singletons';
import {
    AddonModBook,
    AddonModBookBookWSData,
    AddonModBookContentsMap,
    AddonModBookTocChapter,
} from '../../services/book';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreUrl } from '@singletons/url';
import { ADDON_MOD_BOOK_COMPONENT, AddonModBookNavStyle } from '../../constants';
import { CoreModals } from '@services/overlays/modals';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreTagListComponent } from '@features/tag/components/list/list';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays a book contents.
 */
@Component({
    selector: 'page-addon-mod-book-contents',
    templateUrl: 'contents.html',
    styleUrl: 'contents.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreTagListComponent,
    ],
})
export default class AddonModBookContentsPage implements OnInit, OnDestroy {

    @ViewChild(CoreSwipeSlidesComponent) swipeSlidesComponent?: CoreSwipeSlidesComponent;

    title = '';
    cmId!: number;
    courseId!: number;
    initialChapterId?: number;
    component = ADDON_MOD_BOOK_COMPONENT;
    manager?: CoreSwipeSlidesItemsManager<LoadedChapter, AddonModBookSlidesItemsManagerSource>;
    displayNavBar = true;
    navigationItems: CoreNavigationBarItem<AddonModBookTocChapter>[] = [];
    swiperOpts: CoreSwipeSlidesOptions = {
        autoHeight: true,
        observer: true,
        observeParents: true,
        scrollOnChange: 'top',
    };

    loaded = false;

    protected managerUnsubscribe?: () => void;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.initialChapterId = CoreNavigator.getRouteNumberParam('chapterId');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        const source = new AddonModBookSlidesItemsManagerSource(
            this.courseId,
            this.cmId,
            CoreTag.areTagsAvailableInSite(),
            this.initialChapterId,
        );
        this.manager = new CoreSwipeSlidesItemsManager(source);
        this.managerUnsubscribe = this.manager.addListener({
            onSelectedItemUpdated: (item) => {
                this.onChapterViewed(item.id);
            },
        });

        this.fetchContent();
    }

    get module(): CoreCourseModuleData | undefined {
        return this.manager?.getSource().module;
    }

    get book(): AddonModBookBookWSData | undefined {
        return this.manager?.getSource().book;
    }

    get chapters(): AddonModBookTocChapter[] {
        return this.manager?.getSource().chapters || [];
    }

    /**
     * Download book contents and load the current chapter.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async fetchContent(refresh = false): Promise<void> {
        try {
            const source = this.manager?.getSource();
            if (!source) {
                return;
            }

            const { book } = await source.loadBookData();

            this.displayNavBar = book.navstyle != AddonModBookNavStyle.TOC_ONLY;
            this.title = book.name;

            await source.loadContents(refresh);

            await source.load();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.course.errorgetmodule') });
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Change the current chapter.
     *
     * @param chapterId Chapter to load.
     */
    changeChapter(chapterId: number): void {
        if (!chapterId) {
            return;
        }

        this.swipeSlidesComponent?.slideToItem({ id: chapterId });
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @returns Promise resolved when done.
     */
    async doRefresh(refresher?: HTMLIonRefresherElement): Promise<void> {
        if (this.manager) {
            await CorePromiseUtils.ignoreErrors(Promise.all([
                this.manager.getSource().invalidateContent(),
                CoreCourseModulePrefetchDelegate.invalidateCourseUpdates(this.courseId), // To detect if book was updated.
            ]));
        }

        await CorePromiseUtils.ignoreErrors(this.fetchContent(true));

        refresher?.complete();
    }

    /**
     * Show the TOC.
     */
    async showToc(): Promise<void> {
        // Create the toc modal.
        const visibleChapter = this.manager?.getSelectedItem();

        const { AddonModBookTocComponent } = await import('../../components/toc/toc');

        const modalData = await CoreModals.openSideModal<number>({
            component: AddonModBookTocComponent,
            componentProps: {
                moduleId: this.cmId,
                chapters: this.chapters,
                selected: visibleChapter?.id,
                courseId: this.courseId,
                book: this.book,
            },
        });

        if (modalData) {
            this.changeChapter(modalData);
        }
    }

    /**
     * Update data related to chapter being viewed.
     *
     * @param chapterId Chapter viewed.
     * @returns Promise resolved when done.
     */
    protected async onChapterViewed(chapterId: number): Promise<void> {
        if (this.displayNavBar) {
            this.navigationItems = this.getNavigationItems(chapterId);
        }

        if (this.book) {
            AddonModBook.storeLastChapterViewed(this.book.id, chapterId, this.courseId);
        }

        if (!this.module) {
            return;
        }

        // Chapter loaded, log view.
        await CorePromiseUtils.ignoreErrors(AddonModBook.logView(this.module.instance, chapterId));

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: 'mod_book_view_book',
            name: this.module.name,
            data: { id: this.module.instance, category: 'book', chapterid: chapterId },
            url: CoreUrl.addParamsToUrl(`/mod/book/view.php?id=${this.module.id}`, { chapterid: chapterId }),
        });

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
     * @returns Navigation items.
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
        this.manager?.destroy();
        this.managerUnsubscribe?.();

        delete this.manager;
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
    readonly CM_ID: number;
    readonly TAGS_ENABLED: boolean;

    module?: CoreCourseModuleData;
    book?: AddonModBookBookWSData;
    chapters: AddonModBookTocChapter[] = [];
    contentsMap: AddonModBookContentsMap = {};

    constructor(courseId: number, cmId: number, tagsEnabled: boolean, initialChapterId?: number) {
        super(initialChapterId ? { id: initialChapterId } : undefined);

        this.COURSE_ID = courseId;
        this.CM_ID = cmId;
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
     * @returns Promise resolved when done.
     */
    async loadBookData(): Promise<{ module: CoreCourseModuleData; book: AddonModBookBookWSData }> {
        this.module = await CoreCourse.getModule(this.CM_ID, this.COURSE_ID);
        this.book = await AddonModBook.getBook(this.COURSE_ID, this.CM_ID);

        if (!this.initialItem) {
            // No chapter ID specified. Calculate last viewed.
            const lastViewed = await AddonModBook.getLastChapterViewed(this.book.id);

            if (lastViewed) {
                this.initialItem = { id: lastViewed };
            }
        }

        return {
            module: this.module,
            book: this.book,
        };
    }

    /**
     * Load module contents.
     *
     * @param refresh Whether we're refreshing data.
     */
    async loadContents(refresh = false): Promise<void> {
        if (!this.module) {
            return;
        }

        const contents = await this.getModuleContents(refresh);

        this.contentsMap = AddonModBook.getContentsMap(contents);
        this.chapters = AddonModBook.getTocList(contents);
    }

    /**
     * Get module contents.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Module contents.
     */
    protected async getModuleContents(refresh = false): Promise<CoreCourseModuleContentFile[]> {
        if (!this.module) {
            return [];
        }

        const ignoreCache = refresh && CoreNetwork.isOnline();

        try {
            return await CoreCourse.getModuleContents(this.module, this.COURSE_ID, undefined, false, ignoreCache);
        } catch (error) {
            // Error loading contents. If we ignored cache, try to get the cached value.
            if (ignoreCache && !this.module.contents) {
                return await CoreCourse.getModuleContents(this.module);
            } else if (!this.module.contents) {
                // Not able to load contents, throw the error.
                throw error;
            }

            return this.module.contents;
        }
    }

    /**
     * @inheritdoc
     */
    protected async loadItems(): Promise<LoadedChapter[]> {
        try {
            const newChapters = await Promise.all(this.chapters.map(async (chapter) => {
                const content = await AddonModBook.getChapterContent(this.contentsMap, chapter.id, this.CM_ID);

                return {
                    id: chapter.id,
                    content,
                    tags: this.TAGS_ENABLED ? this.contentsMap[chapter.id].tags : [],
                };
            }));

            return newChapters;
        } catch (error) {
            if (!CoreErrorHelper.getErrorMessageFromError(error)) {
                throw new CoreError(Translate.instant('addon.mod_book.errorchapter'));
            }

            throw error;
        }
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    invalidateContent(): Promise<void> {
        return AddonModBook.invalidateContent(this.CM_ID, this.COURSE_ID);
    }

}
