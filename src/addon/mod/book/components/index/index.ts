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

import { Component, Optional, Injector, Input } from '@angular/core';
import { Content, ModalController } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModuleMainResourceComponent } from '@core/course/classes/main-resource-component';
import { AddonModBookProvider, AddonModBookContentsMap, AddonModBookTocChapter } from '../../providers/book';
import { AddonModBookPrefetchHandler } from '../../providers/prefetch-handler';
import { CoreTagProvider } from '@core/tag/providers/tag';

/**
 * Component that displays a book.
 */
@Component({
    selector: 'addon-mod-book-index',
    templateUrl: 'addon-mod-book-index.html',
})
export class AddonModBookIndexComponent extends CoreCourseModuleMainResourceComponent {
    @Input() initialChapterId: string; // The initial chapter ID to load.

    component = AddonModBookProvider.COMPONENT;
    chapterContent: string;
    previousChapter: string;
    nextChapter: string;
    tagsEnabled: boolean;

    protected chapters: AddonModBookTocChapter[];
    protected currentChapter: string;
    protected contentsMap: AddonModBookContentsMap;

    constructor(injector: Injector, private bookProvider: AddonModBookProvider, private courseProvider: CoreCourseProvider,
            private appProvider: CoreAppProvider, private prefetchDelegate: AddonModBookPrefetchHandler,
            private modalCtrl: ModalController, private tagProvider: CoreTagProvider, @Optional() private content: Content) {
        super(injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.tagsEnabled = this.tagProvider.areTagsAvailableInSite();

        this.loadContent();
    }

    /**
     * Show the TOC.
     *
     * @param {MouseEvent} event Event.
     */
    showToc(event: MouseEvent): void {
        // Create the toc modal.
        const modal =  this.modalCtrl.create('AddonModBookTocPage', {
            chapters: this.chapters,
            selected: this.currentChapter
        }, { cssClass: 'core-modal-lateral',
            showBackdrop: true,
            enableBackdropDismiss: true,
            enterAnimation: 'core-modal-lateral-transition',
            leaveAnimation: 'core-modal-lateral-transition' });

        modal.onDidDismiss((chapterId) => {
            if (chapterId) {
                this.changeChapter(chapterId);
            }
        });

        modal.present({
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
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return this.bookProvider.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download book contents and load the current chapter.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        const promises = [];
        let downloadFailed = false;

        // Try to get the book data.
        promises.push(this.bookProvider.getBook(this.courseId, this.module.id).then((book) => {
            this.dataRetrieved.emit(book);
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

            if (typeof this.currentChapter == 'undefined' && typeof this.initialChapterId != 'undefined' && this.chapters) {
                // Initial chapter set. Validate that the chapter exists.
                const chapter = this.chapters.find((chapter) => {
                    return chapter.id == this.initialChapterId;
                });

                if (chapter) {
                    this.currentChapter = this.initialChapterId;
                }
            }

            if (typeof this.currentChapter == 'undefined') {
                // Load the first chapter.
                this.currentChapter = this.bookProvider.getFirstChapter(this.chapters);
            }

            // Show chapter.
            return this.loadChapter(this.currentChapter).then(() => {
                if (downloadFailed && this.appProvider.isOnline()) {
                    // We could load the main file but the download failed. Show error message.
                    this.domUtils.showErrorModal('core.errordownloadingsomefiles', true);
                }

                // All data obtained, now fill the context menu.
                this.fillContextMenu(refresh);
            }).catch(() => {
                // Ignore errors, they're handled inside the loadChapter function.
            });
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
        this.domUtils.scrollToTop(this.content);

        return this.bookProvider.getChapterContent(this.contentsMap, chapterId, this.module.id).then((content) => {
            this.chapterContent = content;
            this.previousChapter = this.bookProvider.getPreviousChapter(this.chapters, chapterId);
            this.nextChapter = this.bookProvider.getNextChapter(this.chapters, chapterId);

            // Chapter loaded, log view. We don't return the promise because we don't want to block the user for this.
            this.bookProvider.logView(this.module.instance, chapterId, this.module.name).then(() => {
                // Module is completed when last chapter is viewed, so we only check completion if the last is reached.
                if (this.nextChapter == '0') {
                    this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
                }
            }).catch(() => {
                // Ignore errors.
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_book.errorchapter', true);

            return Promise.reject(null);
        }).finally(() => {
            this.loaded = true;
            this.refreshIcon = 'refresh';
        });
    }
}
