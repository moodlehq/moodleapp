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
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreBlockComponent } from '@features/block/components/block/block';
import { CoreNavigator } from '@services/navigator';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreUtils } from '@services/utils/utils';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreUserProfile } from '@features/user/services/user';

/**
 * Page that displays the dashboard page.
 */
@Component({
    selector: 'page-core-courses-dashboard',
    templateUrl: 'dashboard.html',
    styleUrls: ['dashboard.scss'],
})
export class CoreCoursesDashboardPage implements OnInit, OnDestroy {

    @ViewChildren(CoreBlockComponent) blocksComponents?: QueryList<CoreBlockComponent>;

    hasMainBlocks = false;
    hasSideBlocks = false;
    searchEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;
    userId?: number;
    blocks: Partial<CoreCourseBlock>[] = [];
    loaded = false;
    
    // Parent/mentee properties
    isParent = false;
    hasChildren = false;
    mentees: CoreUserProfile[] = [];
    selectedMenteeId: number | null = null;

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
            await CoreUtils.ignoreErrors(CoreCourses.logView('dashboard'));

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
    async ngOnInit(): Promise<void> {
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
        this.downloadCourseEnabled = !CoreCourses.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.isDownloadCoursesDisabledInSite();

        // Check if user is a parent and load mentees
        await this.loadParentData();
        
        await this.loadContent();
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

                // Sort blocks to ensure timeline appears first for Aspire School
                this.blocks = blocks.mainBlocks.sort((a, b) => {
                    if (a.name === 'timeline') return -1;
                    if (b.name === 'timeline') return 1;
                    return 0;
                });

                this.hasMainBlocks = CoreBlockDelegate.hasSupportedBlock(blocks.mainBlocks);
                this.hasSideBlocks = CoreBlockDelegate.hasSupportedBlock(blocks.sideBlocks);
            } catch (error) {
                CoreDomUtils.showErrorModal(error);

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
                name: 'timeline',
                visible: true,
            },
            {
                name: 'myoverview',
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
        // Aspire School: Use global search instead of course search
        CoreNavigator.navigateToSitePath('/search');
    }

    /**
     * Navigate to Community News & Events page.
     */
    async scrollToNews(): Promise<void> {
        try {
            // Get site home ID
            const siteHomeId = CoreSites.getCurrentSiteHomeId();
            
            // Get the news forum
            const newsForumData = await CoreSiteHome.getNewsForum(siteHomeId);
            
            if (newsForumData && newsForumData.cmid) {
                // Navigate to the news forum
                await CoreCourseHelper.navigateToModule(newsForumData.cmid, {
                    courseId: newsForumData.course,
                });
            } else {
                // Show message if no news forum exists
                CoreDomUtils.showToast('addon.block_newsitems.pluginname', true);
            }
        } catch (error) {
            // News forum might not exist or be accessible
            CoreDomUtils.showErrorModalDefault(error, 'core.errorloadingcontent', true);
        }
    }

    /**
     * Navigate to Grades page.
     */
    openGrades(): void {
        CoreNavigator.navigateToSitePath('grades');
    }

    /**
     * Load parent-related data.
     */
    protected async loadParentData(): Promise<void> {
        try {
            console.log('Dashboard: Loading parent data...');
            this.isParent = await CoreUserParent.isParentUser();
            console.log('Dashboard: Is parent user?', this.isParent);
            
            if (this.isParent) {
                this.mentees = await CoreUserParent.getMentees();
                console.log('Dashboard: Mentees loaded:', this.mentees);
                this.selectedMenteeId = await CoreUserParent.getSelectedMentee();
                console.log('Dashboard: Selected mentee ID:', this.selectedMenteeId);
            }
            
            // Check if user has children (even if not identified as parent)
            if (!this.mentees || this.mentees.length === 0) {
                // Try to get mentees even if not identified as parent
                try {
                    this.mentees = await CoreUserParent.getMentees();
                } catch {
                    // Ignore errors
                }
            }
            
            this.hasChildren = this.mentees && this.mentees.length > 0;
            console.log('Dashboard: Has children?', this.hasChildren);
        } catch (error) {
            // Silently fail if parent features aren't available
            console.error('Dashboard: Error loading parent data:', error);
            this.isParent = false;
            this.hasChildren = false;
            this.mentees = [];
        }
    }

    /**
     * Select a mentee and navigate to their dashboard.
     * 
     * @param mentee The mentee to select.
     */
    async selectMenteeAndNavigate(mentee: CoreUserProfile): Promise<void> {
        try {
            await CoreUserParent.setSelectedMentee(mentee.id);
            this.selectedMenteeId = mentee.id;
            
            // Invalidate caches to refresh data
            await CoreUtils.ignoreErrors(CoreCourses.invalidateUserCourses());
            await CoreUtils.ignoreErrors(CoreCoursesDashboard.invalidateDashboardBlocks());
            
            // Show toast
            CoreDomUtils.showToast(`Now viewing data for ${mentee.fullname}`);
            
            // Reload the dashboard
            await this.loadContent();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        }
    }

    /**
     * View mentee grades directly.
     * 
     * @param mentee The mentee whose grades to view.
     * @param event Click event to stop propagation.
     */
    async viewMenteeGrades(mentee: CoreUserProfile, event: Event): Promise<void> {
        event.stopPropagation();
        
        // Ensure the mentee is selected first
        if (this.selectedMenteeId !== mentee.id) {
            await CoreUserParent.setSelectedMentee(mentee.id);
            this.selectedMenteeId = mentee.id;
        }
        
        // Navigate to grades
        CoreNavigator.navigateToSitePath('grades');
    }

    /**
     * Clear mentee selection and view own data.
     */
    async clearMenteeSelection(): Promise<void> {
        try {
            await CoreUserParent.clearSelectedMentee();
            this.selectedMenteeId = null;
            
            // Invalidate caches
            await CoreUtils.ignoreErrors(CoreCourses.invalidateUserCourses());
            await CoreUtils.ignoreErrors(CoreCoursesDashboard.invalidateDashboardBlocks());
            
            CoreDomUtils.showToast('Now viewing your own data');
            
            // Reload the dashboard
            await this.loadContent();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        }
    }

    /**
     * Get the name of the currently selected mentee.
     * 
     * @returns The mentee's full name or empty string.
     */
    getSelectedMenteeName(): string {
        if (!this.selectedMenteeId) {
            return '';
        }
        
        const mentee = this.mentees.find(m => m.id === this.selectedMenteeId);
        return mentee?.fullname || '';
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver.off();
    }

}
