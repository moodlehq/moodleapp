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

import { Component, Optional, Input, OnInit, OnDestroy } from '@angular/core';
import { Params } from '@angular/router';
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import CoreCourseContentsPage from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreTag, CoreTagItem } from '@features/tag/services/tag';
import { CoreUser } from '@features/user/services/user';
import { IonContent } from '@ionic/angular';
import { CoreNetwork } from '@services/network';
import { CoreGroup, CoreGroups } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { Translate, NgZone } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CorePath } from '@singletons/path';
import { Subscription } from 'rxjs';
import { Md5 } from 'ts-md5';
import { AddonModWikiPageDBRecord } from '../../services/database/wiki';
import {
    AddonModWiki,
    AddonModWikiPageContents,
    AddonModWikiSubwiki,
    AddonModWikiSubwikiListData,
    AddonModWikiSubwikiListGrouping,
    AddonModWikiSubwikiListSubwiki,
    AddonModWikiSubwikiPage,
    AddonModWikiWiki,
} from '../../services/wiki';
import { AddonModWikiOffline } from '../../services/wiki-offline';
import {
    AddonModWikiAutoSyncData,
    AddonModWikiSync,
    AddonModWikiSyncWikiResult,
    AddonModWikiSyncWikiSubwiki,
} from '../../services/wiki-sync';
import { AddonModWikiMapModalReturn } from '../map/map';
import {
    ADDON_MOD_WIKI_AUTO_SYNCED,
    ADDON_MOD_WIKI_COMPONENT_LEGACY,
    ADDON_MOD_WIKI_MANUAL_SYNCED,
    ADDON_MOD_WIKI_PAGE_CREATED_EVENT,
    ADDON_MOD_WIKI_PAGE_CREATED_OFFLINE_EVENT,
    ADDON_MOD_WIKI_PAGE_NAME,
} from '../../constants';
import { CoreModals } from '@services/overlays/modals';
import { CorePopovers } from '@services/overlays/popovers';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreTagListComponent } from '@features/tag/components/list/list';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';

/**
 * Component that displays a wiki entry page.
 */
@Component({
    selector: 'addon-mod-wiki-index',
    templateUrl: 'addon-mod-wiki-index.html',
    styleUrl: 'index.scss',
    imports: [
        CoreSharedModule,
        CoreTagListComponent,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModWikiIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit, OnDestroy {

    @Input() action?: string;
    @Input() pageId?: number;
    @Input() pageTitle?: string;
    @Input() subwikiId?: number;
    @Input() userId?: number;
    @Input() groupId?: number;

    component = ADDON_MOD_WIKI_COMPONENT_LEGACY;
    componentId?: number;
    pluginName = 'wiki';
    groupWiki = false;

    isOnline = false;

    wiki?: AddonModWikiWiki; // The wiki instance.
    isMainPage = false; // Whether the user is viewing wiki's main page (just entered the wiki).
    canEdit = false; // Whether user can edit the page.
    pageStr = '';
    pageWarning?: string; // Message telling that the page was discarded.
    loadedSubwikis: AddonModWikiSubwiki[] = []; // The loaded subwikis.
    pageIsOffline = false; // Whether the loaded page is an offline page.
    pageContent?: string; // Page content to display.
    tagsEnabled = false;
    currentPageObj?: AddonModWikiPageContents | AddonModWikiPageDBRecord; // Object of the current loaded page.
    tags: CoreTagItem[] = [];
    subwikiData: AddonModWikiSubwikiListData = { // Data for the subwiki selector.
        subwikiSelected: 0,
        userSelected: 0,
        groupSelected: 0,
        subwikis: [],
        count: 0,
    };

    protected syncEventName = ADDON_MOD_WIKI_AUTO_SYNCED;
    protected currentSubwiki?: AddonModWikiSubwiki; // Current selected subwiki.
    protected currentPage?: number; // Current loaded page ID.
    protected subwikiPages?: (AddonModWikiSubwikiPage | AddonModWikiPageDBRecord)[]; // List of subwiki pages.
    protected newPageObserver?: CoreEventObserver; // Observer to check for new pages.
    protected pageCreatedOfflineObserver?: CoreEventObserver; // Observer to check for offline pages.
    protected manualSyncObserver?: CoreEventObserver; // An observer to watch for manual sync events.
    protected ignoreManualSyncEvent = false; // Whether manual sync event should be ignored.
    protected currentUserId?: number; // Current user ID.
    protected currentPath!: string;
    protected onlineSubscription: Subscription; // It will observe the status of the network connection.

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModLessonIndexComponent', content, courseContentsPage);

        this.isOnline = CoreNetwork.isOnline();

        // Refresh online status when changes.
        this.onlineSubscription = CoreNetwork.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.run(() => {
                this.isOnline = CoreNetwork.isOnline();
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        this.pageStr = Translate.instant('addon.mod_wiki.wikipage');
        this.tagsEnabled = CoreTag.areTagsAvailableInSite();
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.isMainPage = !this.pageId && !this.pageTitle;
        this.currentPage = this.pageId;
        this.currentPath = CoreNavigator.getCurrentPath();
        this.listenEvents();

        try {
            await this.loadContent(false, true);
        } finally {
            if (this.action == 'map') {
                this.openMap();
            }
        }
    }

    /**
     * Listen to events.
     */
    protected listenEvents(): void {
        // Listen for manual sync events.
        this.manualSyncObserver = CoreEvents.on(ADDON_MOD_WIKI_MANUAL_SYNCED, (data) => {
            if (!data || !this.wiki || data.wikiId != this.wiki.id) {
                return;
            }

            if (this.ignoreManualSyncEvent) {
                // Event needs to be ignored.
                this.ignoreManualSyncEvent = false;

                return;
            }

            if (this.currentSubwiki) {
                this.checkPageCreatedOrDiscarded(data.subwikis[this.currentSubwiki.id]);
            }

            if (!this.pageWarning) {
                this.showLoadingAndFetch(false, false);
            }
        }, this.siteId);

        // If a new page is created in this wiki, mark that the wiki has offline data and load offline pages in map if needed.
        this.pageCreatedOfflineObserver = CoreEvents.on(ADDON_MOD_WIKI_PAGE_CREATED_OFFLINE_EVENT, async (data) => {
            if (data.wikiId && data.wikiId === this.wiki?.id) {
                // Page created in current wiki, has offline data.
                this.hasOffline = true;
                this.currentSubwiki && await this.loadOfflineSubwikiPages(this.currentSubwiki);

                return;
            }

            if (!data.wikiId) {
                // Cannot tell if it's the same wiki, check if it has offline data now.
                this.hasOffline = await AddonModWikiOffline.subwikisHaveOfflineData(this.loadedSubwikis);

                this.hasOffline && this.currentSubwiki && await this.loadOfflineSubwikiPages(this.currentSubwiki);
            }
        });
    }

    /**
     * Check if the current page was created or discarded.
     *
     * @param data Data about created and deleted pages.
     */
    protected checkPageCreatedOrDiscarded(data?: AddonModWikiSyncWikiSubwiki): void {
        if (this.currentPage || !data) {
            return;
        }

        // This is an offline page. Check if the page was created.
        const page = data.created.find((page) => page.title == this.pageTitle);
        if (page) {
            // Page was created, set the ID so it's retrieved from server.
            this.currentPage = page.pageId;
            this.pageIsOffline = false;
        } else {
            // Page not found in created list, check if it was discarded.
            const page = data.discarded.find((page) => page.title == this.pageTitle);
            if (page) {
                // Page discarded, show warning.
                this.pageWarning = page.warning;
                this.pageContent = '';
                this.pageIsOffline = false;
                this.hasOffline = false;
            }
        }
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh?: boolean, sync = false, showErrors = false): Promise<void> {
        try {
            // Get the wiki instance.
            this.wiki = await AddonModWiki.getWiki(this.courseId, this.module.id);

            if (this.pageContent === undefined) {
                // Page not loaded yet, emit the data to update the page title.
                this.dataRetrieved.emit(this.wiki);
            }

            AddonModWiki.wikiPageOpened(this.wiki.id, this.currentPath);

            if (sync) {
                // Try to synchronize the wiki.
                await CorePromiseUtils.ignoreErrors(this.syncActivity(showErrors));
            }

            if (this.pageWarning) {
                // Page discarded, stop getting data.
                return;
            }

            // Get module instance if it's empty.
            if (!this.module.id) {
                this.module = await CoreCourse.getModule(this.wiki.coursemodule, this.wiki.course, undefined, true);
            }

            this.description = this.wiki.intro || this.module.description;
            this.componentId = this.module.id;

            await this.fetchSubwikis(this.wiki.id);

            // Get the subwiki list data from the cache.
            const subwikiList = AddonModWiki.getSubwikiList(this.wiki.id);

            if (!subwikiList) {
                // Not found in cache, create a new one.
                // Get real groupmode, in case it's forced by the course.
                const groupInfo = await CoreGroups.getActivityGroupInfo(this.wiki.coursemodule);

                if (groupInfo.separateGroups && !groupInfo.groups.length) {
                    throw new CoreError(Translate.instant('addon.mod_wiki.cannotviewpage'));
                }

                await this.createSubwikiList(groupInfo.groups);
            } else {
                this.subwikiData.count = subwikiList.count;
                this.setSelectedWiki(this.subwikiId, this.userId, this.groupId);

                // If nothing was selected using nav params, use the selected from cache.
                if (!this.isAnySubwikiSelected()) {
                    this.setSelectedWiki(subwikiList.subwikiSelected, subwikiList.userSelected, subwikiList.groupSelected);
                }

                this.subwikiData.subwikis = subwikiList.subwikis;
            }

            if (!this.isAnySubwikiSelected() || this.subwikiData.count <= 0) {
                throw new CoreError(Translate.instant('addon.mod_wiki.errornowikiavailable'));
            }

            await this.fetchWikiPage();
        } catch (error) {
            if (this.pageWarning) {
                // Warning is already shown in screen, no need to show a modal.
                return;
            }

            throw error;
        }
    }

    /**
     * Get wiki page contents.
     *
     * @param pageId Page to get.
     * @returns Promise resolved with the page data.
     */
    protected async fetchPageContents(pageId: number): Promise<AddonModWikiPageContents>;
    protected async fetchPageContents(): Promise<AddonModWikiPageDBRecord | undefined>;
    protected async fetchPageContents(pageId?: number): Promise<AddonModWikiPageContents | AddonModWikiPageDBRecord | undefined>;
    protected async fetchPageContents(pageId?: number): Promise<AddonModWikiPageContents | AddonModWikiPageDBRecord | undefined> {
        if (pageId) {
            // Online page.
            this.pageIsOffline = false;

            return AddonModWiki.getPageContents(pageId, { cmId: this.module.id });
        }

        // No page ID but we received a title. This means we're trying to load an offline page.
        try {
            const title = this.pageTitle || this.wiki?.firstpagetitle || '';

            const offlinePage = await AddonModWikiOffline.getNewPage(
                title,
                this.currentSubwiki?.id,
                this.currentSubwiki?.wikiid,
                this.currentSubwiki?.userid,
                this.currentSubwiki?.groupid,
            );

            this.pageIsOffline = true;
            if (!this.newPageObserver) {
                // It's an offline page, listen for new pages event to detect if the user goes to Edit and submits the page.
                this.newPageObserver = CoreEvents.on(ADDON_MOD_WIKI_PAGE_CREATED_EVENT, async (data) => {
                    if (data.subwikiId != this.currentSubwiki?.id || data.pageTitle != title) {
                        return;
                    }

                    // The page has been submitted. Get the page from the server.
                    this.currentPage = data.pageId;

                    // Stop listening for new page events.
                    this.newPageObserver?.off();
                    this.newPageObserver = undefined;

                    await this.showLoadingAndFetch(true, false);

                    this.currentPage && this.logPageViewed(this.currentPage);
                }, CoreSites.getCurrentSiteId());
            }

            return offlinePage;
        } catch {
            // Page not found, ignore.
        }
    }

    /**
     * Fetch the list of pages of a subwiki.
     *
     * @param subwiki Subwiki.
     */
    protected async fetchSubwikiPages(subwiki: AddonModWikiSubwiki): Promise<void> {
        const onlinePages = subwiki.id <= 0 ?
            [] :
            await AddonModWiki.getSubwikiPages(subwiki.wikiid, {
                groupId: subwiki.groupid,
                userId: subwiki.userid,
                cmId: this.module.id,
            });

        this.setCurrentPage(onlinePages);

        // Now get the offline pages.
        const subwikiPages = await this.loadOfflineSubwikiPages(subwiki, onlinePages);

        // Reject if no currentPage selected from the subwikis given (if no subwikis available, do not reject).
        if (!this.currentPage && !this.pageTitle && subwikiPages.length > 0) {
            throw new CoreError();
        }
    }

    /**
     * Load offline subwiki pages to the list of online pages, and store it in subwikiPages.
     *
     * @param subwiki Subwiki to load the pages from.
     * @param onlinePages Online pages. If not found, extract them from subwikiPages.
     * @returns List of online and offline pages.
     */
    protected async loadOfflineSubwikiPages(
        subwiki: AddonModWikiSubwiki,
        onlinePages?: AddonModWikiSubwikiPage[],
    ): Promise<(AddonModWikiSubwikiPage | AddonModWikiPageDBRecord)[]> {
        const dbPages = await AddonModWikiOffline.getSubwikiNewPages(subwiki.id, subwiki.wikiid, subwiki.userid, subwiki.groupid);

        if (!onlinePages) {
            onlinePages = this.subwikiPages?.filter(((page): page is AddonModWikiSubwikiPage => 'id' in page)) || [];
        }

        this.subwikiPages = AddonModWiki.sortPagesByTitle(
            (<(AddonModWikiSubwikiPage | AddonModWikiPageDBRecord)[]> onlinePages).concat(dbPages),
        );

        return this.subwikiPages;
    }

    /**
     * Set current page if needed.
     *
     * @param subwikiPages List of subwiki pages.
     */
    setCurrentPage(subwikiPages: AddonModWikiSubwikiPage[]): void {
        if (this.currentPage) {
            return; // Already set, nothing to do.
        }

        if (this.pageTitle) {
            // Got the page title but not its ID. Search the page.
            const page = subwikiPages.find((page) => page.title === this.pageTitle);
            if (page) {
                this.currentPage = page.id;
            }

            return;
        }

        // No page specified, search first page.
        const firstPage = subwikiPages.find((page) => page.firstpage);
        this.currentPage = firstPage?.id;
        this.pageTitle = firstPage?.title ?? this.wiki?.firstpagetitle;
    }

    /**
     * Get the subwikis.
     *
     * @param wikiId Wiki ID.
     */
    protected async fetchSubwikis(wikiId: number): Promise<void> {
        this.loadedSubwikis = await AddonModWiki.getSubwikis(wikiId, { cmId: this.module.id });

        this.hasOffline = await AddonModWikiOffline.subwikisHaveOfflineData(this.loadedSubwikis);
    }

    /**
     * Fetch the page to be shown.
     *
     * @returns Promise resolved when done.
     */
    protected async fetchWikiPage(): Promise<void> {
        // Search the current Subwiki.
        this.currentSubwiki = this.loadedSubwikis.find((subwiki) => this.isSubwikiSelected(subwiki));

        if (!this.currentSubwiki) {
            throw new CoreError();
        }

        this.setSelectedWiki(this.currentSubwiki.id, this.currentSubwiki.userid, this.currentSubwiki.groupid);

        await this.fetchSubwikiPages(this.currentSubwiki);

        // Check can edit before to have the value if there's no valid page.
        this.canEdit = this.currentSubwiki.canedit;

        const pageContents = await this.fetchPageContents(this.currentPage);

        if (pageContents) {
            this.setSelectedWiki(pageContents.subwikiid, pageContents.userid, pageContents.groupid);

            this.pageTitle = pageContents.title;
            this.pageContent = this.replaceEditLinks(pageContents.cachedcontent);
            this.canEdit = !!pageContents.caneditpage;
            this.currentPageObj = pageContents;
            this.tags = ('tags' in pageContents && pageContents.tags) || [];
        }
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.wiki) {
            return; // Shouldn't happen.
        }

        if (this.pageId) {
            // View page.
            this.checkCompletionAfterLog = false;
            await this.logPageViewed(this.pageId);

            return;
        }

        await AddonModWiki.logView(this.wiki.id);

        if (this.groupId === undefined && this.userId === undefined) {
            // View initial page.
            this.analyticsLogEvent('mod_wiki_view_wiki', { name: this.currentPageObj?.title });

            return;
        }

        // Viewing a different subwiki.
        const hasPersonalSubwikis = this.loadedSubwikis.some(subwiki => subwiki.userid > 0);
        const hasGroupSubwikis = this.loadedSubwikis.some(subwiki => subwiki.groupid > 0);

        let url = `/mod/wiki/view.php?wid=${this.wiki.id}&title=${this.wiki.firstpagetitle}`;
        if (hasPersonalSubwikis && hasGroupSubwikis) {
            url += `&groupanduser=${this.groupId}-${this.userId}`;
        } else if (hasPersonalSubwikis) {
            url += `&uid=${this.userId}`;
        } else {
            url += `&group=${this.groupId}`;
        }

        this.analyticsLogEvent('mod_wiki_view_wiki', {
            name: this.currentPageObj?.title,
            data: { subwiki: this.subwikiId, userid: this.userId, groupid: this.groupId },
            url,
        });
    }

    /**
     * Log page viewed.
     *
     * @param pageId Page ID.
     */
    protected async logPageViewed(pageId: number): Promise<void> {
        if (!this.wiki) {
            return; // Shouldn't happen.
        }

        await CorePromiseUtils.ignoreErrors(AddonModWiki.logPageView(pageId, this.wiki.id));

        this.analyticsLogEvent('mod_wiki_view_page', {
            name: this.currentPageObj?.title,
            data: { pageid: this.pageId },
            url: `/mod/wiki/view.php?page=${this.pageId}`,
        });
    }

    /**
     * @inheritdoc
     */
    protected async storeModuleViewed(): Promise<void> {
        // Only store module viewed when viewing the main page.
        if (!this.pageId) {
            await super.storeModuleViewed();
        }
    }

    /**
     * Get path to the wiki home view. If cannot determine or it's current view, return undefined.
     *
     * @returns The path of the home view
     */
    protected getWikiHomeView(): string | undefined {
        if (!this.wiki) {
            return;
        }

        return AddonModWiki.getFirstWikiPageOpened(this.wiki.id, this.currentPath);
    }

    /**
     * Open the view to create the first page of the wiki.
     */
    protected goToCreateFirstPage(): void {
        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_WIKI_PAGE_NAME}/${this.courseId}/${this.module.id}/edit`,
            {
                params: {
                    pageTitle: this.wiki?.firstpagetitle ?? '',
                    wikiId: this.currentSubwiki?.wikiid,
                    userId: this.currentSubwiki?.userid,
                    groupId: this.currentSubwiki?.groupid,
                },
            },
        );
    }

    /**
     * Open the view to edit the current page.
     */
    goToEditPage(): void {
        if (!this.canEdit) {
            return;
        }

        if (this.currentPageObj) {
            // Current page exists, go to edit it.
            const pageParams: Params = {
                pageTitle: this.currentPageObj.title,
                subwikiId: this.currentPageObj.subwikiid,
            };

            if ('id' in this.currentPageObj) {
                pageParams.pageId = this.currentPageObj.id;
            }

            if (this.currentSubwiki) {
                pageParams.wikiId = this.currentSubwiki.wikiid;
                pageParams.userId = this.currentSubwiki.userid;
                pageParams.groupId = this.currentSubwiki.groupid;
            }

            CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_WIKI_PAGE_NAME}/${this.courseId}/${this.module.id}/edit`,
                { params: pageParams },
            );
        } else if (this.currentSubwiki) {
            // No page loaded, the wiki doesn't have first page.
            this.goToCreateFirstPage();
        }
    }

    /**
     * Go to the view to create a new page.
     */
    goToNewPage(): void {
        if (!this.canEdit) {
            return;
        }

        if (this.currentPageObj) {
            // Current page exists, go to edit it.
            const pageParams: Params = {
                subwikiId: this.currentPageObj.subwikiid,
            };

            if (this.currentSubwiki) {
                pageParams.wikiId = this.currentSubwiki.wikiid;
                pageParams.userId = this.currentSubwiki.userid;
                pageParams.groupId = this.currentSubwiki.groupid;
            }

            CoreNavigator.navigateToSitePath(
                `${ADDON_MOD_WIKI_PAGE_NAME}/${this.courseId}/${this.module.id}/edit`,
                { params: pageParams },
            );
        } else if (this.currentSubwiki) {
            // No page loaded, the wiki doesn't have first page.
            this.goToCreateFirstPage();
        }
    }

    /**
     * Go to view a certain page.
     *
     * @param page Page to view.
     */
    protected async goToPage(page: AddonModWikiSubwikiPage | AddonModWikiPageDBRecord): Promise<void> {
        if (!('id' in page)) {
            // It's an offline page. Check if we are already in the same offline page.
            if (this.currentPage || !this.pageTitle || page.title != this.pageTitle) {
                this.openPageOrSubwiki({
                    pageTitle: page.title,
                    subwikiId: page.subwikiid,
                });
            }
        } else if (this.currentPage != page.id) {
            // Add a new State.
            const pageContents = await this.fetchPageContents(page.id);

            this.openPageOrSubwiki({
                pageTitle: pageContents.title,
                pageId: pageContents.id,
                subwikiId: page.subwikiid,
            });
        }
    }

    /**
     * Open a page or a subwiki in the current wiki.
     *
     * @param options Options
     * @returns Promise.
     */
    protected async openPageOrSubwiki(options: AddonModWikiOpenPageOptions): Promise<void> {
        const hash = Md5.hashAsciiStr(JSON.stringify({
            ...options,
            timestamp: Date.now(),
        }));

        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_WIKI_PAGE_NAME}/${this.courseId}/${this.module.id}/page/${hash}`,
            {
                params: {
                    module: this.module,
                    ...options,
                },
                animated: !options.replace,
                replace: options.replace,
            },
        );
    }

    /**
     * Show the map.
     */
    async openMap(): Promise<void> {
        const { AddonModWikiMapModalComponent } = await import('../map/map');

        // Create the map modal.
        const modalData = await CoreModals.openSideModal<AddonModWikiMapModalReturn>({
            component: AddonModWikiMapModalComponent,
            componentProps: {
                pages: this.subwikiPages,
                homeView: this.getWikiHomeView(),
                moduleId: this.module.id,
                courseId: this.courseId,
                selectedId: this.currentPage,
                selectedTitle: this.currentPageObj && this.currentPageObj.title,
                wiki: this.wiki,
            },
        });

        if (modalData) {
            if (modalData.home) {
                // Go back to the initial page of the wiki.
                CoreNavigator.navigateToSitePath(modalData.home, { animationDirection: 'back' });
            } else if (modalData.page) {
                this.goToPage(modalData.page);
            }
        }

    }

    /**
     * Go to the page to view a certain subwiki.
     *
     * @param subwikiId Subwiki ID.
     * @param userId User ID of the subwiki.
     * @param groupId Group ID of the subwiki.
     */
    goToSubwiki(subwikiId: number, userId: number, groupId: number): void {
        if (
            subwikiId !== this.currentSubwiki?.id ||
            userId !== this.currentSubwiki?.userid ||
            groupId !== this.currentSubwiki?.groupid
        ) {
            this.openPageOrSubwiki({
                subwikiId: subwikiId,
                userId: userId,
                groupId: groupId,
                replace: true,
            });
        }
    }

    /**
     * Checks if there is any subwiki selected.
     *
     * @returns Whether there is any subwiki selected.
     */
    protected isAnySubwikiSelected(): boolean {
        return this.subwikiData.subwikiSelected !== 0 || this.subwikiData.userSelected > 0 || this.subwikiData.groupSelected > 0;
    }

    /**
     * Checks if the given subwiki is the one picked on the subwiki picker.
     *
     * @param subwiki Subwiki to check.
     * @returns Whether it's the selected subwiki.
     */
    protected isSubwikiSelected(subwiki: AddonModWikiSubwiki): boolean {
        if (subwiki.id > 0 && this.subwikiData.subwikiSelected > 0) {
            return subwiki.id == this.subwikiData.subwikiSelected;
        }

        return subwiki.userid == this.subwikiData.userSelected && subwiki.groupid == this.subwikiData.groupSelected;
    }

    /**
     * Replace edit links to have full url.
     *
     * @param content Content to treat.
     * @returns Treated content.
     */
    protected replaceEditLinks(content: string): string {
        content = content.trim();

        if (content.length > 0) {
            const editUrl = CorePath.concatenatePaths(CoreSites.getRequiredCurrentSite().getURL(), '/mod/wiki/edit.php');
            content = content.replace(/href="edit\.php/g, `href="${editUrl}`);
        }

        return content;
    }

    /**
     * Sets the selected subwiki for the subwiki picker.
     *
     * @param subwikiId Subwiki ID to select.
     * @param userId User ID of the subwiki to select.
     * @param groupId Group ID of the subwiki to select.
     */
    protected setSelectedWiki(subwikiId: number | undefined, userId: number | undefined, groupId: number | undefined): void {
        this.subwikiData.subwikiSelected = subwikiId ?? 0;
        this.subwikiData.userSelected = AddonModWikiOffline.convertToPositiveNumber(userId);
        this.subwikiData.groupSelected = AddonModWikiOffline.convertToPositiveNumber(groupId);
    }

    /**
     * @inheritdoc
     */
    protected hasSyncSucceed(result: AddonModWikiSyncWikiResult): boolean {
        if (!result) {
            return false;
        }

        if (result.updated && this.wiki) {
            // Trigger event.
            this.ignoreManualSyncEvent = true;
            CoreEvents.trigger(ADDON_MOD_WIKI_MANUAL_SYNCED, {
                ...result,
                wikiId: this.wiki.id,
            });
        }

        if (this.currentSubwiki) {
            this.checkPageCreatedOrDiscarded(result.subwikis[this.currentSubwiki.id]);
        }

        return result.updated;
    }

    /**
     * User entered the page that contains the component.
     */
    ionViewDidEnter(): void {
        super.ionViewDidEnter();

        const editedPageData = AddonModWiki.consumeEditedPageData();
        if (!editedPageData) {
            return;
        }

        // User has just edited a page. Check if it's the current page.
        if (this.pageId && editedPageData.pageId === this.pageId) {
            this.showLoadingAndRefresh(true, false);

            return;
        }

        const sameSubwiki = this.currentSubwiki &&
            ((this.currentSubwiki.id > 0 && this.currentSubwiki.id === editedPageData.subwikiId) ||
            (this.currentSubwiki.userid === editedPageData.userId && this.currentSubwiki.groupid === editedPageData.groupId));

        if (sameSubwiki && editedPageData.pageTitle === this.pageTitle) {
            this.showLoadingAndRefresh(true, false);

            return;
        }

        // Not same page or we cannot tell. Open the page.
        this.openPageOrSubwiki({
            pageId: editedPageData.pageId,
            pageTitle: editedPageData.pageTitle,
            subwikiId: editedPageData.subwikiId,
            userId: editedPageData.wikiId,
            groupId: editedPageData.groupId,
        });

        if (editedPageData.pageId && (!this.pageContent || this.pageContent.indexOf('/mod/wiki/create.php') != -1)) {
            // Refresh current page anyway because the new page could have been created using the create link.
            this.showLoadingAndRefresh(true, false);
        }
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModWiki.invalidateWikiData(this.courseId));

        if (this.wiki) {
            promises.push(AddonModWiki.invalidateSubwikis(this.wiki.id));
            promises.push(CoreGroups.invalidateActivityAllowedGroups(this.wiki.coursemodule));
            promises.push(CoreGroups.invalidateActivityGroupMode(this.wiki.coursemodule));
        }

        if (this.currentSubwiki) {
            promises.push(AddonModWiki.invalidateSubwikiPages(this.currentSubwiki.wikiid));
            promises.push(AddonModWiki.invalidateSubwikiFiles(this.currentSubwiki.wikiid));
        }

        if (this.currentPage) {
            promises.push(AddonModWiki.invalidatePage(this.currentPage));
        }

        await Promise.all(promises);
    }

    /**
     * @inheritdoc
     */
    protected isRefreshSyncNeeded(syncEventData: AddonModWikiAutoSyncData): boolean {
        if (this.currentSubwiki && syncEventData.subwikiId == this.currentSubwiki.id &&
                syncEventData.wikiId == this.currentSubwiki.wikiid && syncEventData.userId == this.currentSubwiki.userid &&
                syncEventData.groupId == this.currentSubwiki.groupid) {

            if (this.isCurrentView && syncEventData.warnings && syncEventData.warnings.length) {
                // Show warnings.
                CoreAlerts.show({ message: syncEventData.warnings[0] });
            }

            // Check if current page was created or discarded.
            this.checkPageCreatedOrDiscarded(syncEventData);
        }

        return !this.pageWarning;
    }

    /**
     * Show the TOC.
     *
     * @param event Event.
     */
    async showSubwikiPicker(event: MouseEvent): Promise<void> {
        const { AddonModWikiSubwikiPickerComponent } = await import('../subwiki-picker/subwiki-picker');

        const subwiki = await CorePopovers.open<AddonModWikiSubwiki>({
            component: AddonModWikiSubwikiPickerComponent,
            componentProps: {
                courseId: this.courseId,
                subwikis: this.subwikiData.subwikis,
                currentSubwiki: this.currentSubwiki,
            },
            event,
        });

        if (subwiki) {
            this.goToSubwiki(subwiki.id, subwiki.userid, subwiki.groupid);
        }
    }

    /**
     * @inheritdoc
     */
    protected async sync(): Promise<AddonModWikiSyncWikiResult> {
        if (!this.wiki) {
            throw new CoreError('Cannot sync without a wiki.');
        }

        return AddonModWikiSync.syncWiki(this.wiki.id, this.courseId, this.wiki.coursemodule);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.manualSyncObserver?.off();
        this.newPageObserver?.off();
        this.pageCreatedOfflineObserver?.off();
        this.onlineSubscription.unsubscribe();
        if (this.wiki) {
            AddonModWiki.wikiPageClosed(this.wiki.id, this.currentPath);
        }
    }

    /**
     * Create the subwiki list for the selector and store it in the cache.
     *
     * @param userGroups Groups.
     * @returns Promise resolved when done.
     */
    protected async createSubwikiList(userGroups: CoreGroup[]): Promise<void> {
        const subwikiList: AddonModWikiSubwikiListSubwiki[] = [];
        let allParticipants = false;
        let showMyGroupsLabel = false;
        let multiLevelList = false;

        this.subwikiData.subwikis = [];
        this.setSelectedWiki(this.subwikiId, this.userId, this.groupId);
        this.subwikiData.count = 0;

        // Add the subwikis to the subwikiList.
        await Promise.all(this.loadedSubwikis.map(async (subwiki) => {
            let groupLabel = '';

            if (subwiki.groupid === 0 && subwiki.userid === 0) {
                // Add 'All participants' subwiki if needed at the start.
                if (!allParticipants) {
                    subwikiList.unshift({
                        name: Translate.instant('core.allparticipants'),
                        id: subwiki.id,
                        userid: subwiki.userid,
                        groupid: subwiki.groupid,
                        groupLabel: '',
                        canedit: subwiki.canedit,
                    });
                    allParticipants = true;
                }
            } else {
                if (subwiki.groupid !== 0 && userGroups.length > 0) {
                    // Get groupLabel if it has groupId.
                    const group = userGroups.find(group => group.id == subwiki.groupid);
                    groupLabel = group?.name ?? '';
                } else {
                    groupLabel = Translate.instant('addon.mod_wiki.notingroup');
                }

                if (subwiki.userid !== 0) {
                    if (!multiLevelList && subwiki.groupid != 0) {
                        multiLevelList = true;
                    }

                    // Get user if it has userId.
                    const user = await CoreUser.getProfile(subwiki.userid, this.courseId, true);

                    subwikiList.push({
                        name: user.fullname,
                        id: subwiki.id,
                        userid: subwiki.userid,
                        groupid: subwiki.groupid,
                        groupLabel: groupLabel,
                        canedit: subwiki.canedit,
                    });

                } else {
                    subwikiList.push({
                        name: groupLabel,
                        id: subwiki.id,
                        userid: subwiki.userid,
                        groupid: subwiki.groupid,
                        groupLabel: groupLabel,
                        canedit: subwiki.canedit,
                    });
                    showMyGroupsLabel = true;
                }
            }
        }));

        this.fillSubwikiData(subwikiList, showMyGroupsLabel, multiLevelList);
    }

    /**
     * Fill the subwiki data.
     *
     * @param subwikiList List of subwikis.
     * @param showMyGroupsLabel Whether subwikis should be grouped in "My groups" and "Other groups".
     * @param multiLevelList Whether it's a multi level list.
     */
    protected fillSubwikiData(
        subwikiList: AddonModWikiSubwikiListSubwiki[],
        showMyGroupsLabel: boolean,
        multiLevelList: boolean,
    ): void {
        this.groupWiki = showMyGroupsLabel;
        this.subwikiData.count = subwikiList.length;

        // If no subwiki is received as view param, select always the most appropiate.
        if ((!this.subwikiId || (!this.userId && !this.groupId)) && !this.isAnySubwikiSelected() && subwikiList.length > 0) {
            let firstCanEdit: number | undefined;
            let candidateNoFirstPage: number | undefined;
            let candidateFirstPage: number | undefined;

            for (const i in subwikiList) {
                const subwiki = subwikiList[i];

                if (subwiki.canedit) {
                    let candidateSubwikiId: number | undefined;
                    if (subwiki.userid > 0) {
                        // Check if it's the current user.
                        if (this.currentUserId == subwiki.userid) {
                            candidateSubwikiId = subwiki.id;
                        }
                    } else if (subwiki.groupid > 0) {
                        // Check if it's a current user's group.
                        if (showMyGroupsLabel) {
                            candidateSubwikiId = subwiki.id;
                        }
                    } else if (subwiki.id > 0) {
                        candidateSubwikiId = subwiki.id;
                    }

                    if (candidateSubwikiId !== undefined) {
                        if (candidateSubwikiId > 0) {
                            // Subwiki found and created, no need to keep looking.
                            candidateFirstPage = Number(i);
                            break;
                        } else if (candidateNoFirstPage === undefined) {
                            candidateNoFirstPage = Number(i);
                        }
                    } else if (firstCanEdit === undefined) {
                        firstCanEdit = Number(i);
                    }
                }
            }

            let subWikiToTake: number;
            if (candidateFirstPage !== undefined) {
                // Take the candidate that already has the first page created.
                subWikiToTake = candidateFirstPage;
            } else if (candidateNoFirstPage !== undefined) {
                // No first page created, take the first candidate.
                subWikiToTake = candidateNoFirstPage;
            } else if (firstCanEdit !== undefined) {
                // None selected, take the first the user can edit.
                subWikiToTake = firstCanEdit;
            } else {
                // Otherwise take the very first.
                subWikiToTake = 0;
            }

            const subwiki = subwikiList[subWikiToTake];
            if (subwiki !== undefined) {
                this.setSelectedWiki(subwiki.id, subwiki.userid, subwiki.groupid);
            }
        }

        if (multiLevelList) {
            // As we loop over each subwiki, add it to the right group.
            const groupings: Record<number, AddonModWikiSubwikiListGrouping> = {};

            subwikiList.forEach((subwiki) => {
                let grouping = groupings[subwiki.groupid];
                if (!grouping) {
                    // Create a new grouping.
                    grouping = { label: subwiki.groupLabel, subwikis: [] };
                    this.subwikiData.subwikis.push(grouping);
                    groupings[subwiki.groupid] = grouping;
                }

                // Add the subwiki to the currently active grouping.
                grouping.subwikis.push(subwiki);
            });
        } else if (showMyGroupsLabel) {
            const noGroupSubwikis: AddonModWikiSubwikiListSubwiki[] = [];
            const myGroupsSubwikis: AddonModWikiSubwikiListSubwiki[] = [];
            const otherGroupsSubwikis: AddonModWikiSubwikiListSubwiki[] = [];

            // As we loop over each subwiki, add it to the current group.
            subwikiList.forEach((subwiki) => {
                // Add the subwiki to the currently active grouping.
                if (subwiki.groupid === 0 && subwiki.userid === 0) {
                    // All participants
                    noGroupSubwikis.push(subwiki);
                } else if (subwiki.canedit) {
                    myGroupsSubwikis.push(subwiki);
                } else {
                    otherGroupsSubwikis.push(subwiki);
                }
            });

            if (myGroupsSubwikis.length > 0 && otherGroupsSubwikis.length > 0) {
                // Add each grouping to the subwikis.
                if (noGroupSubwikis.length > 0) {
                    this.subwikiData.subwikis.push({ label: '', subwikis: noGroupSubwikis });
                }

                if (myGroupsSubwikis.length > 0) {
                    this.subwikiData.subwikis.push({ label: Translate.instant('core.mygroups'), subwikis: myGroupsSubwikis });
                }

                if (otherGroupsSubwikis.length > 0) {
                    this.subwikiData.subwikis.push({ label: Translate.instant('core.othergroups'), subwikis: otherGroupsSubwikis });
                }
            } else {
                // Mix it again since it does not have groups and other groups.
                this.subwikiData.subwikis.push({ label: '', subwikis: subwikiList });
            }
        } else {
            this.subwikiData.subwikis.push({ label: '', subwikis: subwikiList });
        }

        if (this.wiki) {
            AddonModWiki.setSubwikiList(
                this.wiki.id,
                this.subwikiData.subwikis,
                this.subwikiData.count,
                this.subwikiData.subwikiSelected,
                this.subwikiData.userSelected,
                this.subwikiData.groupSelected,
            );
        }
    }

}

type AddonModWikiOpenPageOptions = {
    subwikiId?: number;
    pageTitle?: string;
    pageId?: number;
    userId?: number;
    groupId?: number;
    replace?: boolean;
};
