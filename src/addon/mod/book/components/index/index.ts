// (C) Copyright 2015 Martin Dougiamas
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

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, Optional } from '@angular/core';
import { NavParams, NavController, Content, PopoverController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '../../../../../providers/app';
import { CoreDomUtilsProvider } from '../../../../../providers/utils/dom';
import { CoreTextUtilsProvider } from '../../../../../providers/utils/text';
import { CoreCourseProvider } from '../../../../../core/course/providers/course';
import { CoreCourseHelperProvider } from '../../../../../core/course/providers/helper';
import { CoreCourseModuleMainComponent } from '../../../../../core/course/providers/module-delegate';
import { AddonModBookProvider, AddonModBookContentsMap, AddonModBookTocChapter } from '../../providers/book';
import { AddonModBookPrefetchHandler } from '../../providers/prefetch-handler';
import { AddonModBookTocPopoverComponent } from '../../components/toc-popover/toc-popover';

/**
 * Component that displays a book.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'index.html',
})
export class AddonModBookIndexComponent implements OnInit, OnDestroy, CoreCourseModuleMainComponent {
    @Input() module: any; // The module of the book.
    @Input() courseId: number; // Course ID the book belongs to.
    @Output() bookRetrieved?: EventEmitter<any>;

    loaded: boolean;
    component = AddonModBookProvider.COMPONENT;
    componentId: number;
    chapterContent: string;
    previousChapter: string;
    nextChapter: string;

    // Data for context menu.
    externalUrl: string;
    description: string;
    refreshIcon: string;
    prefetchStatusIcon: string;
    prefetchText: string;
    size: string;

    protected chapters: AddonModBookTocChapter[];
    protected currentChapter: string;
    protected contentsMap: AddonModBookContentsMap;
    protected isDestroyed = false;
    protected statusObserver;

    constructor(private bookProvider: AddonModBookProvider, private courseProvider: CoreCourseProvider,
            private domUtils: CoreDomUtilsProvider, private appProvider: CoreAppProvider, private textUtils: CoreTextUtilsProvider,
            private courseHelper: CoreCourseHelperProvider, private prefetchDelegate: AddonModBookPrefetchHandler,
            private popoverCtrl: PopoverController, private translate: TranslateService, @Optional() private content: Content) {
        this.bookRetrieved = new EventEmitter();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.description = this.module.description;
        this.componentId = this.module.id;
        this.externalUrl = this.module.url;
        this.loaded = false;
        this.refreshIcon = 'spinner';

        this.fetchContent();
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher.
     * @param {Function} [done] Function to call when done.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void): Promise<any> {
        this.refreshIcon = 'spinner';

        return this.bookProvider.invalidateContent(this.module.id, this.courseId).catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.fetchContent(this.currentChapter, true);
        }).finally(() => {
            this.refreshIcon = 'refresh';
            refresher && refresher.complete();
            done && done();
        });
    }

    /**
     * Show the TOC.
     *
     * @param {MouseEvent} event Event.
     */
    showToc(event: MouseEvent): void {
        const popover = this.popoverCtrl.create(AddonModBookTocPopoverComponent, {
            chapters: this.chapters
        });

        popover.onDidDismiss((chapterId) => {
            this.changeChapter(chapterId);
        });

        popover.present({
            ev: event
        });
    }

    /**
     * Change the current chapter.
     *
     * @param {string} chapterId Chapter to load.
     * @return {Promise<void>} Promise resolved when done.
     */
    changeChapter(chapterId: string): void {
        if (chapterId && chapterId != this.currentChapter) {
            this.loaded = false;
            this.refreshIcon = 'spinner';
            this.loadChapter(chapterId);
        }
    }

    /**
     * Expand the description.
     */
    expandDescription(): void {
        this.textUtils.expandText(this.translate.instant('core.description'), this.description, this.component, this.module.id);
    }

    /**
     * Prefetch the module.
     */
    prefetch(): void {
        this.courseHelper.contextMenuPrefetch(this, this.module, this.courseId);
    }

    /**
     * Confirm and remove downloaded files.
     */
    removeFiles(): void {
        this.courseHelper.confirmAndRemoveFiles(this.module, this.courseId);
    }

    /**
     * Download book contents and load the current chapter.
     *
     * @param {string} [chapterId] Chapter to load.
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(chapterId?: string, refresh?: boolean): Promise<any> {
        const promises = [];
        let downloadFailed = false;

        // Try to get the book data.
        promises.push(this.bookProvider.getBook(this.courseId, this.module.id).then((book) => {
            this.bookRetrieved.emit(book);
            this.description = book.intro || this.description;
        }).catch(() => {
            // Ignore errors since this WS isn't available in some Moodle versions.
        }));

        // Download content. This function also loads module contents if needed.
        promises.push(this.prefetchDelegate.download(this.module, this.courseId).catch(() => {
            // Mark download as failed but go on since the main files could have been downloaded.
            downloadFailed = true;

            if (!this.module.contents.length) {
                // Try to load module contents for offline usage.
                return this.courseProvider.loadModuleContents(this.module, this.courseId);
            }
        }));

        return Promise.all(promises).then(() => {
            this.contentsMap = this.bookProvider.getContentsMap(this.module.contents);
            this.chapters = this.bookProvider.getTocList(this.module.contents);

            if (typeof this.currentChapter == 'undefined') {
                this.currentChapter = this.bookProvider.getFirstChapter(this.chapters);
            }

            // Show chapter.
            return this.loadChapter(chapterId || this.currentChapter).then(() => {
                if (downloadFailed && this.appProvider.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    this.domUtils.showErrorModal('core.errordownloadingsomefiles', true);
                }

                // All data obtained, now fill the context menu.
                this.courseHelper.fillContextMenu(this, this.module, this.courseId, refresh, this.component);
            }).catch(() => {
                // Ignore errors, they're handled inside the loadChapter function.
            });
        }).catch((error) => {
            // Error getting data, fail.
            this.loaded = true;
            this.refreshIcon = 'refresh';
            this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
        });
    }

    /**
     * Load a book chapter.
     *
     * @param {string} chapterId Chapter to load.
     * @return {Promise<void>} Promise resolved when done.
     */
    protected loadChapter(chapterId: string): Promise<void> {
        this.currentChapter = chapterId;
        this.content && this.content.scrollToTop();

        return this.bookProvider.getChapterContent(this.contentsMap, chapterId, this.module.id).then((content) => {
            this.chapterContent = content;
            this.previousChapter = this.bookProvider.getPreviousChapter(this.chapters, chapterId);
            this.nextChapter = this.bookProvider.getNextChapter(this.chapters, chapterId);

            // Chapter loaded, log view. We don't return the promise because we don't want to block the user for this.
            this.bookProvider.logView(this.module.instance, chapterId).then(() => {
                // Module is completed when last chapter is viewed, so we only check completion if the last is reached.
                if (!this.nextChapter) {
                    this.courseProvider.checkModuleCompletion(this.courseId, this.module.completionstatus);
                }
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_book.errorchapter', true);

            return Promise.reject(null);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
        });
    }

    ngOnDestroy(): void {
        this.isDestroyed = true;
        this.statusObserver && this.statusObserver.off();
    }
}
