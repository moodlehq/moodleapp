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
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { Subscription } from 'rxjs';
import { CoreCourses } from '../../services/courses';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreWait } from '@singletons/wait';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSiteLogoComponent } from '../../../../components/site-logo/site-logo';
import { CoreMainMenuUserButtonComponent } from '../../../mainmenu/components/user-menu-button/user-menu-button';
import { CoreBlockSideBlocksButtonComponent } from '../../../block/components/side-blocks-button/side-blocks-button';

/**
 * Page that shows a my courses.
 */
@Component({
    selector: 'page-core-courses-my',
    templateUrl: 'my.html',
    styleUrl: 'my.scss',
    providers: [{
            provide: PageLoadsManager,
            useClass: PageLoadsManager,
        }],
    standalone: true,
    imports: [
    CoreSharedModule,
    CoreSiteLogoComponent,
    CoreMainMenuUserButtonComponent,
    CoreBlockComponent,
    CoreBlockSideBlocksButtonComponent,
],
})
export class CoreCoursesMyPage implements OnInit, OnDestroy, AsyncDirective {

    @ViewChild(CoreBlockComponent) block!: CoreBlockComponent;

    downloadCoursesEnabled = false;
    userId: number;
    loadedBlock?: Partial<CoreCourseBlock>;
    myOverviewBlock?: AddonBlockMyOverviewComponent;
    loaded = false;
    myPageCourses = CoreCoursesDashboardProvider.MY_PAGE_COURSES;
    hasSideBlocks = false;

    protected updateSiteObserver: CoreEventObserver;
    protected onReadyPromise = new CorePromisedValue<void>();
    protected loadsManagerSubscription: Subscription;
    protected logView: () => void;

    constructor(protected loadsManager: PageLoadsManager) {
        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, async () => {
            this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();
        }, CoreSites.getCurrentSiteId());

        this.userId = CoreSites.getCurrentSiteUserId();

        this.loadsManagerSubscription = this.loadsManager.onRefreshPage.subscribe(() => {
            this.loaded = false;
            this.loadContent();
        });

        this.logView = CoreTime.once(async () => {
            await CorePromiseUtils.ignoreErrors(CoreCourses.logView('my'));

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
                this.loadedBlock = blocks.mainBlocks.concat(blocks.sideBlocks).find((block) => block.name === 'myoverview');
                this.hasSideBlocks = supportsMyParam && CoreBlockDelegate.hasSupportedBlock(blocks.sideBlocks);

                await CoreWait.nextTicks(2);

                this.myOverviewBlock = this.block?.dynamicComponent?.instance as AddonBlockMyOverviewComponent;

                if (!this.loadedBlock && !supportsMyParam) {
                    // In old sites, display the block even if not found in Dashboard.
                    // This is because the "My courses" page doesn't exist in the site so it can't be configured.
                    this.loadFallbackBlock();
                }
            } catch (error) {
                CoreAlerts.showError(error);

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

        // Invalidate the blocks.
        if (this.myOverviewBlock) {
            promises.push(CorePromiseUtils.ignoreErrors(this.myOverviewBlock.invalidateContent()));
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
        this.loadsManagerSubscription.unsubscribe();
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return await this.onReadyPromise;
    }

}
