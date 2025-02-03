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

import { Component, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';

import { CoreCourses } from '../../services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreSites } from '@services/sites';
import { CoreCoursesDashboard } from '@features/courses/services/dashboard';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockComponent } from '@features/block/components/block/block';
import { CoreNavigator } from '@services/navigator';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreBlockSideBlocksButtonComponent } from '../../../block/components/side-blocks-button/side-blocks-button';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays the dashboard page.
 */
@Component({
    selector: 'page-core-courses-dashboard',
    templateUrl: 'dashboard.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreBlockComponent,
        CoreBlockSideBlocksButtonComponent,
    ],
})
export default class CoreCoursesDashboardPage implements OnInit, OnDestroy {

    @ViewChildren(CoreBlockComponent) blocksComponents?: QueryList<CoreBlockComponent>;

    hasMainBlocks = false;
    hasSideBlocks = false;
    searchEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;
    userId?: number;
    blocks: Partial<CoreCourseBlock>[] = [];
    loaded = false;

    protected updateSiteObserver: CoreEventObserver;
    protected logView: () => void;

    constructor() {
        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
            this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        }, CoreSites.getCurrentSiteId());

        this.logView = CoreTime.once(async () => {
            await CorePromiseUtils.ignoreErrors(CoreCourses.logView('dashboard'));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_my_view_page',
                name: Translate.instant('core.courses.mymoodle'),
                data: { category: 'course', page: 'dashboard' },
                url: '/my/',
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        this.loadContent();
    }

    /**
     * Convenience function to fetch the dashboard data.
     *
     * @returns Promise resolved when done.
     */
    protected async loadContent(): Promise<void> {
        const available = await CoreCoursesDashboard.isAvailable();
        const disabled = await CoreCoursesDashboard.isDisabled();

        if (available && !disabled) {
            this.userId = CoreSites.getCurrentSiteUserId();

            try {
                const blocks = await CoreCoursesDashboard.getDashboardBlocks();

                this.blocks = blocks.mainBlocks;

                this.hasMainBlocks = CoreBlockDelegate.hasSupportedBlock(blocks.mainBlocks);
                this.hasSideBlocks = CoreBlockDelegate.hasSupportedBlock(blocks.sideBlocks);
            } catch (error) {
                CoreAlerts.showError(error);

                // Cannot get the blocks, just show dashboard if needed.
                this.loadFallbackBlocks();
            }
        } else if (!available) {
            // Not available, but not disabled either. Use fallback.
            this.loadFallbackBlocks();
        } else {
            // Disabled.
            this.blocks = [];
        }

        this.loaded = true;

        this.logView();
    }

    /**
     * Load fallback blocks to shown before 3.6 when dashboard blocks are not supported.
     */
    protected loadFallbackBlocks(): void {
        this.blocks = [
            {
                name: 'myoverview',
                visible: true,
            },
            {
                name: 'timeline',
                visible: true,
            },
        ];

        this.hasMainBlocks = CoreBlockDelegate.isBlockSupported('myoverview') || CoreBlockDelegate.isBlockSupported('timeline');
    }

    /**
     * Refresh the dashboard data.
     *
     * @param refresher Refresher.
     */
    refreshDashboard(refresher: HTMLIonRefresherElement): void {
        const promises: Promise<void>[] = [];

        promises.push(CoreCoursesDashboard.invalidateDashboardBlocks());

        // Invalidate the blocks.
        this.blocksComponents?.forEach((blockComponent) => {
            promises.push(blockComponent.invalidate().catch(() => {
                // Ignore errors.
            }));
        });

        Promise.all(promises).finally(() => {
            this.loadContent().finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Go to search courses.
     */
    async openSearch(): Promise<void> {
        CoreNavigator.navigateToSitePath('/courses/list', { params : { mode: 'search' } });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver.off();
    }

}
