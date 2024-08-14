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

import { ContextLevel } from '@/core/constants';
import { ADDON_BLOG_ENTRY_UPDATED } from '@addons/blog/constants';
import { AddonBlog, AddonBlogFilter, AddonBlogPost, AddonBlogProvider } from '@addons/blog/services/blog';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreComments } from '@features/comments/services/comments';
import { CoreMainMenuDeepLinkManager } from '@features/mainmenu/classes/deep-link-manager';
import { CoreTag } from '@features/tag/services/tag';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreNavigator } from '@services/navigator';
import { CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreFileHelper } from '@services/file-helper';
import { CoreUrl } from '@singletons/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreArray } from '@singletons/array';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreTime } from '@singletons/time';
import { CorePopovers } from '@services/popovers';
import { CoreLoadings } from '@services/loadings';

/**
 * Page that displays the list of blog entries.
 */
@Component({
    selector: 'page-addon-blog-index',
    templateUrl: 'index.html',
    styleUrl: './index.scss',
})
export class AddonBlogIndexPage implements OnInit, OnDestroy {

    title = '';

    protected filter: AddonBlogFilter = {};
    protected pageLoaded = 0;
    protected siteHomeId: number;
    protected logView: () => void;

    loaded = false;
    canLoadMore = false;
    loadMoreError = false;
    entries: AddonBlogPostFormatted[] = [];
    currentUserId: number;
    showMyEntriesToggle = false;
    onlyMyEntries = false;
    component = AddonBlogProvider.COMPONENT;
    commentsEnabled = false;
    tagsEnabled = false;
    contextLevel: ContextLevel = ContextLevel.SYSTEM;
    contextInstanceId = 0;
    entryUpdateObserver: CoreEventObserver;
    optionsAvailable = false;

    constructor() {
        this.currentUserId = CoreSites.getCurrentSiteUserId();
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();

        this.logView = CoreTime.once(async () => {
            await CoreUtils.ignoreErrors(AddonBlog.logView(this.filter));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'core_blog_view_entries',
                name: this.title,
                data: {
                    ...this.filter,
                    category: 'blog',
                },
                url: CoreUrl.addParamsToUrl('/blog/index.php', {
                    ...this.filter,
                    modid: this.filter.cmid,
                    cmid: undefined,
                }),
            });
        });

        this.entryUpdateObserver = CoreEvents.on(ADDON_BLOG_ENTRY_UPDATED, async () => {
            this.loaded = false;
            await CoreUtils.ignoreErrors(this.refresh());
            this.loaded = true;
        });
    }

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        const userId = CoreNavigator.getRouteNumberParam('userId');
        const courseId = CoreNavigator.getRouteNumberParam('courseId');
        const cmId = CoreNavigator.getRouteNumberParam('cmId');
        const entryId = CoreNavigator.getRouteNumberParam('entryId');
        const groupId = CoreNavigator.getRouteNumberParam('groupId');
        const tagId = CoreNavigator.getRouteNumberParam('tagId');

        if (!userId && !courseId && !cmId && !entryId && !groupId && !tagId) {
            this.title = 'addon.blog.siteblogheading';
        } else {
            this.title = 'addon.blog.blogentries';
        }

        if (userId) {
            this.filter.userid = userId;
        }

        if (courseId) {
            this.filter.courseid = courseId;
        }

        if (cmId) {
            this.filter.cmid = cmId;
        }

        if (entryId) {
            this.filter.entryid = entryId;
        }

        if (groupId) {
            this.filter.groupid = groupId;
        }

        if (tagId) {
            this.filter.tagid = tagId;
        }

        this.showMyEntriesToggle = !userId && !this.filter.entryid;

        // Calculate the context level.
        if (userId && !courseId && !cmId) {
            this.contextLevel = ContextLevel.USER;
            this.contextInstanceId = userId;
        } else if (courseId && courseId != this.siteHomeId) {
            this.contextLevel = ContextLevel.COURSE;
            this.contextInstanceId = courseId;
        } else {
            this.contextLevel = ContextLevel.SYSTEM;
            this.contextInstanceId = 0;
        }

        this.commentsEnabled = CoreComments.areCommentsEnabledInSite();
        this.tagsEnabled = CoreTag.areTagsAvailableInSite();

        const deepLinkManager = new CoreMainMenuDeepLinkManager();
        deepLinkManager.treatLink();

        await this.fetchEntries();
        this.optionsAvailable = await AddonBlog.isEditingEnabled();
    }

    /**
     * Fetch blog entries.
     *
     * @param refresh Empty events array first.
     * @returns Promise with the entries.
     */
    protected async fetchEntries(refresh: boolean = false): Promise<void> {
        this.loadMoreError = false;

        if (refresh) {
            this.pageLoaded = 0;
        }

        try {
            const result = await AddonBlog.getEntries(
                this.filter,
                {
                    page: this.pageLoaded,
                    readingStrategy: refresh
                        ? CoreSitesReadingStrategy.PREFER_NETWORK
                        : undefined,
                },
            );

            const promises = result.entries.map(async (entry: AddonBlogPostFormatted) => {
                switch (entry.publishstate) {
                    case 'draft':
                        entry.publishTranslated = 'publishtonoone';
                        break;
                    case 'site':
                        entry.publishTranslated = 'publishtosite';
                        break;
                    case 'public':
                        entry.publishTranslated = 'publishtoworld';
                        break;
                    default:
                        entry.publishTranslated = 'privacy:unknown';
                        break;
                }

                // Calculate the context. This code was inspired by calendar events, Moodle doesn't do this for blogs.
                if (entry.moduleid || entry.coursemoduleid) {
                    entry.contextLevel = ContextLevel.MODULE;
                    entry.contextInstanceId = entry.moduleid || entry.coursemoduleid;
                } else if (entry.courseid) {
                    entry.contextLevel = ContextLevel.COURSE;
                    entry.contextInstanceId = entry.courseid;
                } else {
                    entry.contextLevel = ContextLevel.USER;
                    entry.contextInstanceId = entry.userid;
                }

                entry.summary = CoreFileHelper.replacePluginfileUrls(entry.summary, entry.summaryfiles || []);

                entry.user = await CoreUtils.ignoreErrors(CoreUser.getProfile(entry.userid, entry.courseid, true));
            });

            if (refresh) {
                this.entries = result.entries;
            } else {
                this.entries = CoreArray.unique(this.entries
                    .concat(result.entries), 'id')
                    .sort((a, b) => b.created - a.created);
            }

            this.canLoadMore = result.totalentries > this.entries.length;
            this.pageLoaded++;
            await Promise.all(promises);
            this.logView();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.blog.errorloadentries', true);
            this.loadMoreError = true; // Set to prevent infinite calls with infinite-loading.
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Toggle between showing only my entries or not.
     *
     * @param enabled If true, filter my entries. False otherwise.
     */
    async onlyMyEntriesToggleChanged(enabled: boolean): Promise<void> {
        const loading = await CoreLoadings.show();

        try {
            this.filter.userid = !enabled ? undefined : this.currentUserId;
            await this.fetchEntries(true);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.blog.errorloadentries', true);
            this.onlyMyEntries = !enabled;
            this.filter.userid = !enabled ? this.currentUserId : undefined;
        } finally {
            loading.dismiss();
        }
    }

    /**
     * Function to load more entries.
     *
     * @param infiniteComplete Infinite scroll complete function. Only used from core-infinite-loading.
     * @returns Resolved when done.
     */
    loadMore(infiniteComplete?: () => void): Promise<void> {
        return this.fetchEntries().finally(() => {
            infiniteComplete && infiniteComplete();
        });
    }

    /**
     * Refresh blog entries on PTR.
     *
     * @param refresher Refresher instance.
     */
    async refresh(refresher?: HTMLIonRefresherElement): Promise<void> {
        const promises = this.entries.map((entry) =>
            CoreComments.invalidateCommentsData(ContextLevel.USER, entry.userid, this.component, entry.id, 'format_blog'));

        promises.push(AddonBlog.invalidateEntries(this.filter));

        if (this.showMyEntriesToggle) {
            this.filter['userid'] = this.currentUserId;
            promises.push(AddonBlog.invalidateEntries(this.filter));

            if (!this.onlyMyEntries) {
                delete this.filter['userid'];
            }

        }

        await CoreUtils.allPromises(promises);
        await this.fetchEntries(true);
        refresher?.complete();
    }

    /**
     * Redirect to entry creation form.
     */
    createNewEntry(): void {
        CoreNavigator.navigateToSitePath('blog/edit/0', { params: { cmId: this.filter.cmid } });
    }

    /**
     * Delete entry by id.
     *
     * @param id Entry id.
     */
    async deleteEntry(id: number): Promise<void> {
        const loading = await CoreLoadings.show();
        try {
            await AddonBlog.deleteEntry({ entryid: id });
            await this.refresh();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.blog.errorloadentries', true);
        } finally {
            loading.dismiss();
        }
    }

    /**
     * Show the context menu.
     *
     * @param event Click Event.
     */
    async showEntryActionsPopover(event: Event, entry: AddonBlogPostFormatted): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const { AddonBlogEntryOptionsMenuComponent } =
            await import('@addons/blog/components/entry-options-menu/entry-options-menu');

        const popoverData = await CorePopovers.open<string>({
            component: AddonBlogEntryOptionsMenuComponent,
            event,
        });

        switch (popoverData) {
            case 'edit':
                await CoreNavigator.navigateToSitePath(`blog/edit/${entry.id}`, {
                    params: this.filter.cmid
                        ? { cmId: this.filter.cmid, filters: this.filter, lastModified: entry.lastmodified }
                        : { filters: this.filter, lastModified: entry.lastmodified },
                });
                break;
            case 'delete':
                await this.deleteEntry(entry.id);
                break;
            default:
                break;
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.entryUpdateObserver.off();
    }

}

/**
 * Blog post with some calculated data.
 */
type AddonBlogPostFormatted = AddonBlogPost & {
    publishTranslated?: string; // Calculated in the app. Key of the string to translate the publish state of the post.
    user?: CoreUserProfile; // Calculated in the app. Data of the user that wrote the post.
    contextLevel?: ContextLevel; // Calculated in the app. The context level of the entry.
    contextInstanceId?: number; // Calculated in the app. The context instance id.
};
