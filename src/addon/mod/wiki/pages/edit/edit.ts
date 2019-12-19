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
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModWikiProvider } from '../../providers/wiki';
import { AddonModWikiOfflineProvider } from '../../providers/wiki-offline';
import { AddonModWikiSyncProvider, AddonModWikiSyncSubwikiResult } from '../../providers/wiki-sync';

/**
 * Page that allows adding or editing a wiki page.
 */
@IonicPage({ segment: 'addon-mod-wiki-edit' })
@Component({
    selector: 'page-addon-mod-wiki-edit',
    templateUrl: 'edit.html',
})
export class AddonModWikiEditPage implements OnInit, OnDestroy {

    title: string; // Title to display.
    pageForm: FormGroup; // The form group.
    contentControl: FormControl; // The FormControl for the page content.
    canEditTitle: boolean; // Whether title can be edited.
    loaded: boolean; // Whether the data has been loaded.
    component = AddonModWikiProvider.COMPONENT; // Component to link the files to.
    componentId: number; // Component ID to link the files to.
    wrongVersionLock: boolean; // Whether the page lock doesn't match the initial one.

    protected module: any; // Wiki module instance.
    protected courseId: number; // Course the wiki belongs to.
    protected subwikiId: number; // Subwiki ID the page belongs to.
    protected initialSubwikiId: number; // Same as subwikiId, but it won't be updated, it'll always be the value received.
    protected wikiId: number; // Wiki ID the page belongs to.
    protected pageId: number; // The page ID (if editing a page).
    protected section: string; // The section being edited.
    protected groupId: number; // The group the subwiki belongs to.
    protected userId: number; // The user the subwiki belongs to.
    protected blockId: string; // ID to block the subwiki.
    protected editing: boolean; // Whether the user is editing a page (true) or creating a new one (false).
    protected editOffline: boolean; // Whether the user is editing an offline page.
    protected subwikiFiles: any[]; // List of files of the subwiki.
    protected originalContent: string; // The original page content.
    protected version: number; // Page version.
    protected renewLockInterval: any; // An interval to renew the lock every certain time.
    protected forceLeave = false; // To allow leaving the page without checking for changes.
    protected isDestroyed = false; // Whether the page has been destroyed.
    protected pageParamsToLoad: any; // Params of the page to load when this page is closed.

    constructor(navParams: NavParams, fb: FormBuilder, protected navCtrl: NavController, protected sitesProvider: CoreSitesProvider,
            protected syncProvider: CoreSyncProvider, protected domUtils: CoreDomUtilsProvider,
            protected translate: TranslateService, protected courseProvider: CoreCourseProvider,
            protected eventsProvider: CoreEventsProvider, protected wikiProvider: AddonModWikiProvider,
            protected wikiOffline: AddonModWikiOfflineProvider, protected wikiSync: AddonModWikiSyncProvider,
            protected textUtils: CoreTextUtilsProvider, protected courseHelper: CoreCourseHelperProvider) {

        this.module = navParams.get('module') || {};
        this.courseId = navParams.get('courseId');
        this.subwikiId = navParams.get('subwikiId');
        this.wikiId = navParams.get('wikiId');
        this.pageId = navParams.get('pageId');
        this.section = navParams.get('section');
        this.groupId = navParams.get('groupId');
        this.userId = navParams.get('userId');

        let pageTitle = navParams.get('pageTitle');
        pageTitle = pageTitle ? pageTitle.replace(/\+/g, ' ') : '';

        this.initialSubwikiId = this.subwikiId;
        this.componentId = this.module.id;
        this.canEditTitle = !pageTitle;
        this.title = pageTitle ? this.translate.instant('addon.mod_wiki.editingpage', {$a: pageTitle}) :
                this.translate.instant('addon.mod_wiki.newpagehdr');
        this.blockId = this.wikiSync.getSubwikiBlockId(this.subwikiId, this.wikiId, this.userId, this.groupId);

        // Create the form group and its controls.
        this.contentControl = fb.control('');
        this.pageForm = fb.group({
            title: pageTitle
        });
        this.pageForm.addControl('text', this.contentControl);

        // Block the wiki so it cannot be synced.
        this.syncProvider.blockOperation(this.component, this.blockId);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.fetchWikiPageData().then((success) => {
            if (success && this.blockId && !this.isDestroyed) {
                // Block the subwiki now that we have blockId for sure.
                const newBlockId = this.wikiSync.getSubwikiBlockId(this.subwikiId, this.wikiId, this.userId, this.groupId);
                if (newBlockId != this.blockId) {
                    this.syncProvider.unblockOperation(this.component, this.blockId);
                    this.blockId = newBlockId;
                    this.syncProvider.blockOperation(this.component, this.blockId);
                }
            }
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Convenience function to get wiki page data.
     *
     * @return Promise resolved with boolean: whether it was successful.
     */
    protected fetchWikiPageData(): Promise<boolean> {
        let promise,
            canEdit = false;

        if (this.pageId) {
            // Editing a page that already exists.
            this.canEditTitle = false;
            this.editing = true;
            this.editOffline = false; // Cannot edit pages in offline.

            // Get page contents to obtain title and editing permission
            promise = this.wikiProvider.getPageContents(this.pageId).then((pageContents) => {
                this.pageForm.controls.title.setValue(pageContents.title); // Set the title in the form group.
                this.wikiId = pageContents.wikiid;
                this.subwikiId = pageContents.subwikiid;
                this.title = this.translate.instant('addon.mod_wiki.editingpage', {$a: pageContents.title});
                this.groupId = pageContents.groupid;
                this.userId = pageContents.userid;
                canEdit = pageContents.caneditpage;

                // Wait for sync to be over (if any).
                return this.wikiSync.waitForSync(this.blockId);
            }).then(() => {
                // Get subwiki files, needed to replace URLs for rich text editor.
                return this.wikiProvider.getSubwikiFiles(this.wikiId, this.groupId, this.userId);
            }).then((files) => {
                this.subwikiFiles = files;

                // Get editable text of the page/section.
                return this.wikiProvider.getPageForEditing(this.pageId, this.section);
            }).then((editContents) => {
                // Get the original page contents, treating file URLs if needed.
                const content = this.textUtils.replacePluginfileUrls(editContents.content, this.subwikiFiles);

                this.contentControl.setValue(content);
                this.originalContent = content;
                this.version = editContents.version;

                if (canEdit) {
                    // Renew the lock every certain time.
                    this.renewLockInterval = setInterval(() => {
                        this.renewLock();
                    }, AddonModWikiProvider.RENEW_LOCK_TIME);
                }
            });
        } else {
            const pageTitle = this.pageForm.controls.title.value;

            // New page. Wait for sync to be over (if any).
            promise = this.wikiSync.waitForSync(this.blockId);

            if (pageTitle) {
                // Title is set, it could be editing an offline page or creating a new page using an edit link.
                promise = promise.then((result: AddonModWikiSyncSubwikiResult) => {

                    // First of all, verify if this page was created in the current sync.
                    if (result) {
                        const page = result.created.find((page) => {
                                return page.title == pageTitle;
                            });

                        if (page && page.pageId > 0) {
                            // Page was created, now it exists in the site.
                            this.pageId = page.pageId;

                            return this.fetchWikiPageData();
                        }
                    }

                    // Check if there's already some offline data for this page.
                    return this.wikiOffline.getNewPage(pageTitle, this.subwikiId, this.wikiId, this.userId, this.groupId);
                }).then((page) => {
                    // Load offline content.
                    this.contentControl.setValue(page.cachedcontent);
                    this.originalContent = page.cachedcontent;
                    this.editOffline = true;
                }).catch(() => {
                    // No offline data found.
                    this.editOffline = false;
                });
            } else {
                this.editOffline = false;
            }

            promise.then(() => {
                this.editing = false;
                canEdit = !!this.blockId; // If no blockId, the user cannot edit the page.
            });
        }

        return promise.then(() => {
            return true;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting wiki data.');

            // Go back.
            this.forceLeavePage();

            return false;
        }).finally(() => {
            if (!canEdit) {
                // Cannot edit, show alert and go back.
                this.domUtils.showAlert(this.translate.instant('core.notice'),
                        this.translate.instant('addon.mod_wiki.cannoteditpage'));
                this.forceLeavePage();
            }
        });
    }

    /**
     * Force leaving the page, without checking for changes.
     */
    protected forceLeavePage(): void {
        this.forceLeave = true;
        this.navCtrl.pop();
    }

    /**
     * Navigate to a new offline page.
     *
     * @param title Page title.
     */
    protected goToNewOfflinePage(title: string): void {
        if (this.courseId && (this.module.id || this.wikiId)) {
            // We have enough data to navigate to the page.
            if (!this.editOffline || this.previousViewPageIsDifferentOffline(title)) {
                this.pageParamsToLoad = {
                    module: this.module,
                    courseId: this.courseId,
                    pageId: null,
                    pageTitle: title,
                    wikiId: this.wikiId,
                    subwikiId: this.subwikiId,
                    userId: this.userId,
                    groupId: this.groupId
                };
            }
        } else {
            this.domUtils.showAlert(this.translate.instant('core.success'), this.translate.instant('core.datastoredoffline'));
        }

        this.forceLeavePage();
    }

    /**
     * Check if we need to navigate to a new state.
     *
     * @param title Page title.
     * @return Promise resolved when done.
     */
    protected gotoPage(title: string): Promise<any> {
        return this.retrieveModuleInfo(this.wikiId).then(() => {
            let openPage = false;

            // Not the firstpage.
            if (this.initialSubwikiId) {
                if (!this.editing && this.editOffline && this.previousViewPageIsDifferentOffline(title)) {
                    // The user submitted an offline page that isn't loaded in the back view, open it.
                    openPage = true;
                } else if (!this.editOffline && this.previousViewIsDifferentPageOnline()) {
                    // The user submitted an offline page that isn't loaded in the back view, open it.
                    openPage = true;
                }
            }

            if (openPage) {
                // Setting that will do the app navigate to the page.
                this.pageParamsToLoad = {
                    module: this.module,
                    courseId: this.courseId,
                    pageId: this.pageId,
                    pageTitle: title,
                    wikiId: this.wikiId,
                    subwikiId: this.subwikiId,
                    userId: this.userId,
                    groupId: this.groupId
                };
            }

            this.forceLeavePage();
        }).catch(() => {
            // Go back if it fails.
            this.forceLeavePage();
        });
    }

    /**
     * Check if data has changed.
     *
     * @return Whether data has changed.
     */
    protected hasDataChanged(): boolean {
        const values = this.pageForm.value;

        return !(this.originalContent == values.text || (!this.editing && !values.text && !values.title));
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        // Check if data has changed.
        if (this.hasDataChanged()) {
            return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
        }

        return true;
    }

    /**
     * View left.
     */
    ionViewDidLeave(): void {
        if (this.pageParamsToLoad) {
            // Go to the page we've just created/edited.
            this.navCtrl.push('AddonModWikiIndexPage', this.pageParamsToLoad);
        }
    }

    /**
     * In case we are NOT editing an offline page, check if the page loaded in previous view is different than this view.
     *
     * @return Whether previous view wiki page is different than current page.
     */
    protected previousViewIsDifferentPageOnline(): boolean {
        // We cannot precisely detect when the state is the same but this is close to it.
        const previousView = this.navCtrl.getPrevious();

        return !this.editing || previousView.component.name != 'AddonModWikiIndexPage' ||
                previousView.data.module.id != this.module.id || previousView.data.pageId != this.pageId;
    }

    /**
     * In case we're editing an offline page, check if the page loaded in previous view is different than this view.
     *
     * @param title The current page title.
     * @return Whether previous view wiki page is different than current page.
     */
    protected previousViewPageIsDifferentOffline(title: string): boolean {
        // We cannot precisely detect when the state is the same but this is close to it.
        const previousView = this.navCtrl.getPrevious();

        if (previousView.component.name != 'AddonModWikiIndexPage' || previousView.data.module.id != this.module.id ||
                previousView.data.wikiId != this.wikiId || previousView.data.pageTitle != title) {
            return true;
        }

        // Check subwiki using subwiki or user and group.
        const previousSubwikiId = parseInt(previousView.data.subwikiId, 10) || 0;
        if (previousSubwikiId > 0 && this.subwikiId > 0) {
            return previousSubwikiId != this.subwikiId;
        }

        const previousUserId = parseInt(previousView.data.userId, 10) || 0,
            previousGroupId = parseInt(previousView.data.groupId, 10) || 0;

        return this.userId != previousUserId || this.groupId != previousGroupId;
    }

    /**
     * Save the data.
     */
    save(): void {
        const values = this.pageForm.value,
            title = values.title,
            modal = this.domUtils.showModalLoading('core.sending', true);
        let promise,
            text = values.text;

        text = this.textUtils.restorePluginfileUrls(text, this.subwikiFiles);
        text = this.textUtils.formatHtmlLines(text);

        if (this.editing) {
            // Edit existing page.
            promise = this.wikiProvider.editPage(this.pageId, text, this.section).then(() => {
                // Invalidate page since it changed.
                return this.wikiProvider.invalidatePage(this.pageId).then(() => {
                    return this.gotoPage(title);
                });
            });
        } else {
            // Creating a new page.
            if (!title) {
                // Title is mandatory, stop.
                this.domUtils.showAlert(this.translate.instant('core.notice'),
                        this.translate.instant('addon.mod_wiki.titleshouldnotbeempty'));
                modal.dismiss();

                return;
            }

            if (!this.editOffline) {
                // Check if the user has an offline page with the same title.
                promise = this.wikiOffline.getNewPage(title, this.subwikiId, this.wikiId, this.userId, this.groupId).then(() => {
                    // There's a page with same name, reject with error message.
                    return Promise.reject(this.translate.instant('addon.mod_wiki.pageexists'));
                }, () => {
                    // Not found, page can be sent.
                });
            } else {
                promise = Promise.resolve();
            }

            promise = promise.then(() => {
                // Try to send the page.
                let wikiId = this.wikiId || (this.module && this.module.instance);

                return this.wikiProvider.newPage(title, text, this.subwikiId, wikiId, this.userId, this.groupId).then((id) => {
                    if (id > 0) {
                        // Page was created, get its data and go to the page.
                        this.pageId = id;

                        return this.wikiProvider.getPageContents(this.pageId).then((pageContents) => {
                            const promises = [];

                            wikiId = parseInt(pageContents.wikiid, 10);
                            if (!this.subwikiId) {
                                // Subwiki was not created, invalidate subwikis as well.
                                promises.push(this.wikiProvider.invalidateSubwikis(wikiId));
                            }

                            this.subwikiId = parseInt(pageContents.subwikiid, 10);
                            this.userId = parseInt(pageContents.userid, 10);
                            this.groupId = parseInt(pageContents.groupid, 10);

                            // Invalidate subwiki pages since there are new.
                            promises.push(this.wikiProvider.invalidateSubwikiPages(wikiId));

                            return Promise.all(promises).then(() => {
                                return this.gotoPage(title);
                            });
                        }).finally(() => {
                            // Notify page created.
                            this.eventsProvider.trigger(AddonModWikiProvider.PAGE_CREATED_EVENT, {
                                pageId: this.pageId,
                                subwikiId: this.subwikiId,
                                pageTitle: title,
                            }, this.sitesProvider.getCurrentSiteId());
                        });
                    } else {
                        // Page stored in offline. Go to see the offline page.
                        this.goToNewOfflinePage(title);
                    }
                });
            });
        }

        return promise.catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error saving wiki data.');
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Renew lock and control versions.
     */
    protected renewLock(): void {
        this.wikiProvider.getPageForEditing(this.pageId, this.section, true).then((response) => {
            if (response.version && this.version != response.version) {
                this.wrongVersionLock = true;
            }
        });
    }

    /**
     * Fetch module information to redirect when needed.
     *
     * @param wikiId Wiki ID.
     * @return Promise resolved when done.
     */
    protected retrieveModuleInfo(wikiId: number): Promise<any> {
        if (this.module.id && this.courseId) {
            // We have enough data.
            return Promise.resolve();
        }

        const promise = this.module.id ? Promise.resolve(this.module) :
                this.courseProvider.getModuleBasicInfoByInstance(wikiId, 'wiki');

        return promise.then((mod) => {
            this.module = mod;
            this.componentId = this.module.id;

            if (!this.courseId && this.module.course) {
                this.courseId = this.module.course;
            } else if (!this.courseId) {
                return this.courseHelper.getModuleCourseIdByInstance(wikiId, 'wiki').then((course) => {
                    this.courseId = course;
                });
            }
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        clearInterval(this.renewLockInterval);

        // Unblock the subwiki.
        if (this.blockId) {
            this.syncProvider.unblockOperation(this.component, this.blockId);
        }
    }
}
