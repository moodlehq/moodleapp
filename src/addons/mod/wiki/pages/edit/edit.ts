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

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { CoreError } from '@classes/errors/error';
import { CoreCourse } from '@features/course/services/course';
import { CanLeave } from '@guards/can-leave';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreSync } from '@services/sync';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreWSFile } from '@services/ws';
import { Translate } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CoreForms } from '@singletons/form';
import { AddonModWiki } from '../../services/wiki';
import { AddonModWikiOffline } from '../../services/wiki-offline';
import { AddonModWikiSync } from '../../services/wiki-sync';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ADDON_MOD_WIKI_COMPONENT, ADDON_MOD_WIKI_PAGE_CREATED_EVENT, ADDON_MOD_WIKI_RENEW_LOCK_TIME } from '../../constants';
import { CoreLoadings } from '@services/loadings';
import { CoreFileHelper } from '@services/file-helper';

/**
 * Page that allows adding or editing a wiki page.
 */
@Component({
    selector: 'page-addon-mod-wiki-edit',
    templateUrl: 'edit.html',
})
export class AddonModWikiEditPage implements OnInit, OnDestroy, CanLeave {

    @ViewChild('editPageForm') formElement?: ElementRef;

    cmId?: number; // Course module ID.
    courseId?: number; // Course the wiki belongs to.
    title?: string; // Title to display.
    pageForm: FormGroup; // The form group.
    contentControl: FormControl<string>; // The FormControl for the page content.
    canEditTitle = false; // Whether title can be edited.
    loaded = false; // Whether the data has been loaded.
    component = ADDON_MOD_WIKI_COMPONENT; // Component to link the files to.
    wrongVersionLock = false; // Whether the page lock doesn't match the initial one.
    editorExtraParams: Record<string, unknown> = {};

    protected subwikiId?: number; // Subwiki ID the page belongs to.
    protected wikiId?: number; // Wiki ID the page belongs to.
    protected pageId?: number; // The page ID (if editing a page).
    protected section?: string; // The section being edited.
    protected groupId?: number; // The group the subwiki belongs to.
    protected userId?: number; // The user the subwiki belongs to.
    protected blockId?: string; // ID to block the subwiki.
    protected editing = false; // Whether the user is editing a page (true) or creating a new one (false).
    protected editOffline = false; // Whether the user is editing an offline page.
    protected subwikiFiles: CoreWSFile[] = []; // List of files of the subwiki.
    protected originalContent?: string; // The original page content.
    protected originalTitle?: string; // The original page title.
    protected version?: number; // Page version.
    protected renewLockInterval?: number; // An interval to renew the lock every certain time.
    protected forceLeave = false; // To allow leaving the page without checking for changes.
    protected isDestroyed = false; // Whether the page has been destroyed.

    constructor(
        protected formBuilder: FormBuilder,
    ) {
        this.contentControl = this.formBuilder.control('', { nonNullable: true });
        this.pageForm = this.formBuilder.group({});
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.cmId = CoreNavigator.getRouteNumberParam('cmId') || undefined;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId') || undefined;
        this.subwikiId = CoreNavigator.getRouteNumberParam('subwikiId');
        this.wikiId = CoreNavigator.getRouteNumberParam('wikiId');
        this.pageId = CoreNavigator.getRouteNumberParam('pageId');
        this.section = CoreNavigator.getRouteParam('section');
        this.groupId = CoreNavigator.getRouteNumberParam('groupId');
        this.userId = CoreNavigator.getRouteNumberParam('userId');

        const pageTitle = CoreNavigator.getRouteParam<string>('pageTitle');
        this.originalTitle = pageTitle ? CoreText.cleanTags(pageTitle.replace(/\+/g, ' '), { singleLine: true }) : '';

        this.canEditTitle = !this.originalTitle;
        this.title = this.originalTitle ?
            Translate.instant('addon.mod_wiki.editingpage', { $a: this.originalTitle }) :
            Translate.instant('addon.mod_wiki.newpagehdr');
        this.blockId = AddonModWikiSync.getSubwikiBlockId(this.subwikiId, this.wikiId, this.userId, this.groupId);

        // Create the form group and its controls.
        this.pageForm.addControl('title', this.formBuilder.control(this.originalTitle));
        this.pageForm.addControl('text', this.contentControl);

        // Block the wiki so it cannot be synced.
        CoreSync.blockOperation(this.component, this.blockId);

        if (this.pageId) {
            this.editorExtraParams.pageid = this.pageId;

            if (this.section) {
                this.editorExtraParams.section = this.section;
            }
        } else if (this.originalTitle) {
            this.editorExtraParams.pagetitle = this.originalTitle;
        }

        try {
            const success = await this.fetchWikiPageData();

            if (success && !this.isDestroyed) {
                // Block the subwiki now that we have blockId for sure.
                const newBlockId = AddonModWikiSync.getSubwikiBlockId(this.subwikiId, this.wikiId, this.userId, this.groupId);
                if (newBlockId !== this.blockId) {
                    CoreSync.unblockOperation(this.component, this.blockId);
                    this.blockId = newBlockId;
                    CoreSync.blockOperation(this.component, this.blockId);
                }

                this.logView();
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Convenience function to get wiki page data.
     *
     * @returns Promise resolved with boolean: whether it was successful.
     */
    protected async fetchWikiPageData(): Promise<boolean> {
        let canEdit = false;
        let fetchFailed = false;

        try {
            // Wait for sync to be over (if any).
            const syncResult = this.blockId ? await AddonModWikiSync.waitForSync(this.blockId) : undefined;

            if (this.pageId) {
                // Editing a page that already exists.
                this.canEditTitle = false;
                this.editing = true;
                this.editOffline = false; // Cannot edit pages in offline.

                // Get page contents to obtain title and editing permission
                const pageContents = await AddonModWiki.getPageContents(this.pageId, { cmId: this.cmId });

                this.pageForm.controls.title.setValue(pageContents.title); // Set the title in the form group.
                this.wikiId = pageContents.wikiid;
                this.subwikiId = pageContents.subwikiid;
                this.title = Translate.instant('addon.mod_wiki.editingpage', { $a: pageContents.title });
                this.originalTitle = pageContents.title;
                this.groupId = pageContents.groupid;
                this.userId = pageContents.userid;
                canEdit = pageContents.caneditpage;

                await this.fetchModuleAndCourseId();

                // Get subwiki files, needed to replace URLs for rich text editor.
                this.subwikiFiles = await AddonModWiki.getSubwikiFiles(this.wikiId, {
                    groupId: this.groupId,
                    userId: this.userId,
                    cmId: this.cmId,
                });

                // Get editable text of the page/section.
                const editContents = await AddonModWiki.getPageForEditing(this.pageId, this.section);

                // Get the original page contents, treating file URLs if needed.
                const content = CoreFileHelper.replacePluginfileUrls(editContents.content || '', this.subwikiFiles);

                this.contentControl.setValue(content);
                this.originalContent = content;
                this.version = editContents.version;

                if (canEdit) {
                    // Renew the lock every certain time.
                    this.renewLockInterval = window.setInterval(() => {
                        this.renewLock();
                    }, ADDON_MOD_WIKI_RENEW_LOCK_TIME);
                }
            } else {
                const pageTitle = this.pageForm.controls.title.value;
                this.editing = false;
                canEdit = !!this.blockId; // If no blockId, the user cannot edit the page.

                await this.fetchModuleAndCourseId();

                // Try to get wikiId.
                if (!this.wikiId && this.cmId && this.courseId) {
                    const module = await CoreCourse.getModule(this.cmId, this.courseId, undefined, true);

                    this.wikiId = module.instance;
                }

                if (pageTitle) {
                    // Title is set, it could be editing an offline page or creating a new page using an edit link.
                    // First of all, verify if this page was created in the current sync.
                    if (syncResult) {
                        const page = syncResult.created.find((page) => page.title == pageTitle);

                        if (page && page.pageId > 0) {
                            // Page was created, now it exists in the site.
                            this.pageId = page.pageId;

                            return this.fetchWikiPageData();
                        }
                    }

                    // Check if there's already some offline data for this page.
                    const page = await CorePromiseUtils.ignoreErrors(
                        AddonModWikiOffline.getNewPage(pageTitle, this.subwikiId, this.wikiId, this.userId, this.groupId),
                    );

                    if (page) {
                        // Load offline content.
                        this.contentControl.setValue(page.cachedcontent);
                        this.originalContent = page.cachedcontent;
                        this.editOffline = true;
                    } else {
                        // No offline data found.
                        this.editOffline = false;
                    }
                } else {
                    this.editOffline = false;
                }
            }

            return true;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error getting wiki data.');
            fetchFailed = true;

            // Go back.
            this.forceLeavePage();

            return false;
        } finally {
            if (!canEdit && !fetchFailed) {
                // Cannot edit, show alert and go back.
                CoreDomUtils.showAlert(Translate.instant('core.notice'), Translate.instant('addon.mod_wiki.cannoteditpage'));
                this.forceLeavePage();
            }
        }
    }

    /**
     * Load cmId and courseId if they aren't set.
     *
     * @returns Promise.
     */
    protected async fetchModuleAndCourseId(): Promise<void> {
        if (!this.wikiId || (this.cmId && this.courseId)) {
            return;
        }

        const module = await CoreCourse.getModuleBasicInfoByInstance(
            this.wikiId,
            'wiki',
            { readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE },
        );

        this.cmId = module.id;
        this.courseId = module.course;
    }

    /**
     * Force leaving the page, without checking for changes.
     */
    protected forceLeavePage(): void {
        this.forceLeave = true;
        CoreNavigator.back();
    }

    /**
     * Navigate to a page.
     *
     * @param title Page title.
     */
    protected goToPage(title: string): void {
        if (!this.wikiId) {
            return;
        }

        // Not the firstpage.
        AddonModWiki.setEditedPageData({
            cmId: this.cmId,
            courseId: this.courseId,
            pageId: this.pageId,
            pageTitle: title,
            wikiId: this.wikiId,
            subwikiId: this.subwikiId,
            userId: this.userId,
            groupId: this.groupId,
        });

        this.forceLeavePage();
    }

    /**
     * Check if data has changed.
     *
     * @returns Whether data has changed.
     */
    protected hasDataChanged(): boolean {
        const values = this.pageForm.value;

        return !(this.originalContent == values.text || (!this.editing && !values.text && !values.title));
    }

    /**
     * @inheritdoc
     */
    async canLeave(): Promise<boolean> {
        if (this.forceLeave) {
            return true;
        }

        // Check if data has changed.
        if (this.hasDataChanged()) {
            await CoreDomUtils.showConfirm(Translate.instant('core.confirmcanceledit'));
        }

        CoreForms.triggerFormCancelledEvent(this.formElement, CoreSites.getCurrentSiteId());

        return true;
    }

    /**
     * @inheritdoc
     */
    ionViewDidLeave(): void {
        // When going back, the ionViewDidEnter of the previous page should be called before this ionViewDidLeave.
        // But just in case, use a timeout to make sure it does.
        setTimeout(() => {
            // Remove the edited page data (if any) if the previous page isn't a wiki page.
            AddonModWiki.consumeEditedPageData();
        }, 200);
    }

    /**
     * Save the data.
     *
     * @returns Promise resolved when done.
     */
    async save(): Promise<void> {
        const values = this.pageForm.value;
        const title = values.title;
        let text = values.text ?? '';

        const modal = await CoreLoadings.show('core.sending', true);

        text = CoreFileHelper.restorePluginfileUrls(text, this.subwikiFiles);
        text = CoreText.formatHtmlLines(text);

        try {
            if (this.editing && this.pageId) {
                // Edit existing page.
                await AddonModWiki.editPage(this.pageId, text, this.section);

                CoreForms.triggerFormSubmittedEvent(this.formElement, true, CoreSites.getCurrentSiteId());

                // Invalidate page since it changed.
                await AddonModWiki.invalidatePage(this.pageId);

                return this.goToPage(title);
            }

            // Creating a new page.
            if (!title) {
                // Title is mandatory, stop.
                modal.dismiss();
                CoreDomUtils.showAlert(
                    Translate.instant('core.notice'),
                    Translate.instant('addon.mod_wiki.titleshouldnotbeempty'),
                );

                return;
            }

            if (!this.editOffline) {
                // Check if the user has an offline page with the same title.
                const page = await CorePromiseUtils.ignoreErrors(
                    AddonModWikiOffline.getNewPage(title, this.subwikiId, this.wikiId, this.userId, this.groupId),
                );

                if (page) {
                    // There's a page with same title, reject with error message.
                    throw new CoreError(Translate.instant('addon.mod_wiki.pageexists'));
                }
            }

            // Try to send the page.
            const id = await AddonModWiki.newPage(title, text, {
                subwikiId: this.subwikiId,
                wikiId: this.wikiId,
                userId: this.userId,
                groupId: this.groupId,
                cmId: this.cmId,
            });

            CoreForms.triggerFormSubmittedEvent(this.formElement, id > 0, CoreSites.getCurrentSiteId());

            if (id <= 0) {
                // Page stored in offline. Go to see the offline page.
                return this.goToPage(title);
            }

            // Page was created, get its data and go to the page.
            CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'wiki' });
            this.pageId = id;

            const pageContents = await AddonModWiki.getPageContents(this.pageId, { cmId: this.cmId });

            const promises: Promise<unknown>[] = [];
            this.wikiId = pageContents.wikiid;

            // Invalidate subwiki pages since there are new.
            promises.push(AddonModWiki.invalidateSubwikiPages(this.wikiId));
            if (!this.subwikiId) {
                // Subwiki was not created, invalidate subwikis as well.
                promises.push(AddonModWiki.invalidateSubwikis(this.wikiId));
            }

            this.subwikiId = pageContents.subwikiid;
            this.userId = pageContents.userid;
            this.groupId = pageContents.groupid;

            await CorePromiseUtils.ignoreErrors(Promise.all(promises));

            // Notify page created.
            CoreEvents.trigger(ADDON_MOD_WIKI_PAGE_CREATED_EVENT, {
                pageId: this.pageId,
                subwikiId: this.subwikiId,
                pageTitle: title,
            }, CoreSites.getCurrentSiteId());

            this.goToPage(title);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'Error saving wiki data.');
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Renew lock and control versions.
     */
    protected async renewLock(): Promise<void> {
        if (!this.pageId) {
            return;
        }

        const response = await AddonModWiki.getPageForEditing(this.pageId, this.section, true);

        if (response.version && this.version != response.version) {
            this.wrongVersionLock = true;
        }
    }

    /**
     * Log view.
     */
    protected logView(): void {
        let url: string;
        if (this.pageId) {
            url = `/mod/wiki/edit.php?pageid=${this.pageId}` +
                (this.section ? `&section=${this.section.replace(/ /g, '+')}` : '');
        } else if (this.originalTitle) {
            const title = this.originalTitle.replace(/ /g, '+');
            if (this.subwikiId) {
                url = `/mod/wiki/create.php?swid=${this.subwikiId}&title=${title}&action=new`;
            } else {
                url = `/mod/wiki/create.php?wid=${this.wikiId}&group=${this.groupId ?? 0}&uid=${this.userId ?? 0}&title=${title}`;
            }
        } else {
            url = `/mod/wiki/create.php?action=new&wid=${this.wikiId}&swid=${this.subwikiId}`;
        }

        CoreAnalytics.logEvent({
            type: CoreAnalyticsEventType.VIEW_ITEM,
            ws: this.pageId ? 'mod_wiki_edit_page' : 'mod_wiki_new_page',
            name: this.originalTitle ?? Translate.instant('addon.mod_wiki.newpagehdr'),
            data: { id: this.wikiId, subwiki: this.subwikiId, category: 'wiki' },
            url,
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;
        clearInterval(this.renewLockInterval);

        // Unblock the subwiki.
        if (this.blockId) {
            CoreSync.unblockOperation(this.component, this.blockId);
        }
    }

}
