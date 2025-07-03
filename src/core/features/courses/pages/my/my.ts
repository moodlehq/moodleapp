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

import { AddonBlockMyOverviewComponent } from '@addons/block/myoverview/components/myoverview/myoverview';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AsyncDirective } from '@classes/async-directive';
import { PageLoadsManager } from '@classes/page-loads-manager';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreBlockComponent } from '@features/block/components/block/block';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreCoursesDashboard, CoreCoursesDashboardProvider } from '@features/courses/services/dashboard';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import { CoreCourses } from '../../services/courses';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreWait } from '@singletons/wait';

/**
 * Page that shows a my courses.
 */
@Component({
    selector: 'page-core-courses-my',
    templateUrl: 'my.html',
    styleUrls: ['my.scss'],
    providers: [{
        provide: PageLoadsManager,
        useClass: PageLoadsManager,
    }],
})
export class CoreCoursesMyPage implements OnInit, OnDestroy, AsyncDirective {

    @ViewChild(CoreBlockComponent) block!: CoreBlockComponent;

    siteName = '';
    downloadCoursesEnabled = false;
    userId: number;
    loadedBlock?: Partial<CoreCourseBlock>;
    myOverviewBlock?: AddonBlockMyOverviewComponent;
    loaded = false;
    myPageCourses = CoreCoursesDashboardProvider.MY_PAGE_COURSES;
    hasSideBlocks = false;

    protected updateSiteObserver: CoreEventObserver;
    protected profileRefreshObserver?: CoreEventObserver;
    protected onReadyPromise = new CorePromisedValue<void>();
    protected loadsManagerSubscription: Subscription;
    protected logView: () => void;

    constructor(protected loadsManager: PageLoadsManager) {
        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async () => {
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();
            await this.loadSiteName();

        }, CoreSites.getCurrentSiteId());

        this.userId = CoreSites.getCurrentSiteUserId();

        this.loadsManagerSubscription = this.loadsManager.onRefreshPage.subscribe(() => {
            this.loaded = false;
            this.loadContent();
        });

        // Listen for profile refresh events (e.g., when switching between parent/mentee view)
        this.profileRefreshObserver = CoreEvents.on('user_profile_refreshed', () => {
            console.log('[My Courses] Profile refreshed, reloading courses...');
            this.loaded = false;
            this.loadContent();
        }, CoreSites.getCurrentSiteId());

        this.logView = CoreTime.once(async () => {
            await CoreUtils.ignoreErrors(CoreCourses.logView('my'));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_my_view_page',
                name: Translate.instant('core.courses.mycourses'),
                data: { category: 'course', page: 'my' },
                url: '/my/courses.php',
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        CoreSites.loginNavigationFinished();

        await this.loadSiteName();

        this.loadContent(true);
    }

    /**
     * Load data.
     *
     * @param firstLoad Whether it's the first load.
     */
    protected async loadContent(firstLoad = false): Promise<void> {
        const loadWatcher = this.loadsManager.startPageLoad(this, !!firstLoad);
        const available = await CoreCoursesDashboard.isAvailable();
        const disabled = await CoreCourses.isMyCoursesDisabled();

        const supportsMyParam = !!CoreSites.getCurrentSite()?.isVersionGreaterEqualThan('4.0');

        if (available && !disabled) {
            try {
                const blocks = await loadWatcher.watchRequest(
                    CoreCoursesDashboard.getDashboardBlocksObservable({
                        myPage: supportsMyParam ? this.myPageCourses : undefined,
                        readingStrategy: loadWatcher.getReadingStrategy(),
                    }),
                );

                // My overview block should always be in main blocks, but check side blocks too just in case.
                this.loadedBlock = blocks.mainBlocks.concat(blocks.sideBlocks).find((block) => block.name == 'myoverview');
                this.hasSideBlocks = supportsMyParam && CoreBlockDelegate.hasSupportedBlock(blocks.sideBlocks);

                await CoreWait.nextTicks(2);

                this.myOverviewBlock = this.block?.dynamicComponent?.instance as AddonBlockMyOverviewComponent;

                if (!this.loadedBlock && !supportsMyParam) {
                    // In old sites, display the block even if not found in Dashboard.
                    // This is because the "My courses" page doesn't exist in the site so it can't be configured.
                    this.loadFallbackBlock();
                }
            } catch (error) {
                CoreDomUtils.showErrorModal(error);

                // Cannot get the blocks, just show the block if needed.
                this.loadFallbackBlock();
            }
        } else if (!available) {
            // WS not available, show fallback block.
            this.loadFallbackBlock();
        } else {
            this.loadedBlock = undefined;
        }

        this.loaded = true;
        this.onReadyPromise.resolve();

        this.logView();
    }

    /**
     * Load the site name.
     */
    protected async loadSiteName(): Promise<void> {
        const site = CoreSites.getRequiredCurrentSite();
        this.siteName = await site.getSiteName() || '';
    }

    /**
     * Load fallback blocks.
     */
    protected loadFallbackBlock(): void {
        this.loadedBlock = {
            name: 'myoverview',
            visible: true,
        };
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    async refresh(refresher?: HTMLIonRefresherElement): Promise<void> {

        const promises: Promise<void>[] = [];

        promises.push(CoreCoursesDashboard.invalidateDashboardBlocks(CoreCoursesDashboardProvider.MY_PAGE_COURSES));
        
        // Invalidate all user courses caches to ensure fresh data
        promises.push(CoreCourses.invalidateAllUserCourses());

        // Invalidate the blocks.
        if (this.myOverviewBlock) {
            promises.push(CoreUtils.ignoreErrors(this.myOverviewBlock.invalidateContent()));
        }

        Promise.all(promises).finally(() => {
            this.loadContent().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
        this.profileRefreshObserver?.off();
        this.loadsManagerSubscription.unsubscribe();
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return await this.onReadyPromise;
    }

}
