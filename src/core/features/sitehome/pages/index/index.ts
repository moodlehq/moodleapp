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

import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonRefresher } from '@ionic/angular';
import { Params } from '@angular/router';

import { CoreSite, CoreSiteConfig } from '@classes/site';
import { CoreCourse, CoreCourseWSModule, CoreCourseWSSection } from '@features/course/services/course';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSites } from '@services/sites';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreCourses, CoreCoursesProvider } from '@features//courses/services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseHelper, CoreCourseModule } from '@features/course/services/course-helper';
import { CoreBlockCourseBlocksComponent } from '@features/block/components/course-blocks/course-blocks';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays site home index.
 */
@Component({
    selector: 'page-core-sitehome-index',
    templateUrl: 'index.html',
})
export class CoreSiteHomeIndexPage implements OnInit, OnDestroy {

    @ViewChild(CoreBlockCourseBlocksComponent) courseBlocksComponent?: CoreBlockCourseBlocksComponent;

    dataLoaded = false;
    section?: CoreCourseWSSection & {
        hasContent?: boolean;
    };

    hasContent = false;
    items: string[] = [];
    siteHomeId = 1;
    currentSite!: CoreSite;
    searchEnabled = false;
    displayEnableDownload = false;
    downloadEnabled = false;
    newsForumModule?: NewsForum;

    protected updateSiteObserver: CoreEventObserver;
    protected downloadEnabledObserver: CoreEventObserver;

    constructor() {
        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();

            this.displayEnableDownload = !CoreSites.getRequiredCurrentSite().isOfflineDisabled();
        }, CoreSites.getCurrentSiteId());

        this.downloadEnabledObserver = CoreEvents.on(CoreCoursesProvider.EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED, (data) => {
            this.downloadEnabled = data.enabled;
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();

        this.currentSite = CoreSites.getRequiredCurrentSite();
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();

        const module = CoreNavigator.getRouteParam<CoreCourseModule>('module');
        if (module) {
            const modParams = CoreNavigator.getRouteParam<Params>('modParams');
            CoreCourseHelper.openModule(module, this.siteHomeId, undefined, modParams);
        }

        this.displayEnableDownload = !CoreSites.getRequiredCurrentSite().isOfflineDisabled();
        this.downloadEnabled = CoreCourses.getCourseDownloadOptionsEnabled();

        this.loadContent().finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Convenience function to fetch the data.
     *
     * @return Promise resolved when done.
     */
    protected async loadContent(): Promise<void> {
        this.hasContent = false;

        const config = this.currentSite.getStoredConfig() || { numsections: 1, frontpageloggedin: undefined };

        this.items = await CoreSiteHome.getFrontPageItems(config.frontpageloggedin);
        this.hasContent = this.items.length > 0;

        if (this.items.some((item) => item == 'NEWS_ITEMS')) {
            // Get the news forum.
            try {
                const forum = await CoreSiteHome.getNewsForum(this.siteHomeId);
                this.newsForumModule = await CoreCourse.getModule(forum.cmid, forum.course);
                this.newsForumModule.handlerData = await CoreCourseModuleDelegate.getModuleDataFor(
                    this.newsForumModule.modname,
                    this.newsForumModule,
                    this.siteHomeId,
                    undefined,
                    true,
                );
            } catch {
                // Ignore errors.
            }
        }

        try {
            const sections = await CoreCourse.getSections(this.siteHomeId, false, true);

            // Check "Include a topic section" setting from numsections.
            this.section = config.numsections ? sections.find((section) => section.section == 1) : undefined;
            if (this.section) {
                const result = CoreCourseHelper.addHandlerDataForModules(
                    [this.section],
                    this.siteHomeId,
                    undefined,
                    undefined,
                    true,
                );
                this.hasContent = result.hasContent || this.hasContent;
            }

            // Add log in Moodle.
            CoreCourse.logView(
                this.siteHomeId,
                undefined,
                undefined,
                this.currentSite.getInfo()?.sitename,
            ).catch(() => {
                // Ignore errors.
            });
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher?: IonRefresher): void {
        const promises: Promise<unknown>[] = [];

        promises.push(CoreCourse.invalidateSections(this.siteHomeId));
        promises.push(this.currentSite.invalidateConfig().then(async () => {
            // Config invalidated, fetch it again.
            const config: CoreSiteConfig = await this.currentSite.getConfig();
            this.currentSite.setConfig(config);

            return;
        }));

        if (this.section && this.section.modules) {
            // Invalidate modules prefetch data.
            promises.push(CoreCourseModulePrefetchDelegate.invalidateModules(this.section.modules, this.siteHomeId));
        }

        if (this.courseBlocksComponent) {
            promises.push(this.courseBlocksComponent.invalidateBlocks());
        }

        Promise.all(promises).finally(async () => {
            const p2: Promise<unknown>[] = [];

            p2.push(this.loadContent());
            if (this.courseBlocksComponent) {
                p2.push(this.courseBlocksComponent.loadContent());
            }

            await Promise.all(p2).finally(() => {
                refresher?.complete();
            });
        });
    }

    /**
     * Switch download enabled.
     */
    switchDownload(): void {
        CoreCourses.setCourseDownloadOptionsEnabled(this.downloadEnabled);
    }

    /**
     * Open page to manage courses storage.
     */
    manageCoursesStorage(): void {
        CoreNavigator.navigateToSitePath('/storage');
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        CoreNavigator.navigateToSitePath('courses/list', { params : { mode: 'search' } });
    }

    /**
     * Go to available courses.
     */
    openAvailableCourses(): void {
        CoreNavigator.navigateToSitePath('courses/list', { params : { mode: 'all' } });
    }

    /**
     * Go to my courses.
     */
    openMyCourses(): void {
        CoreNavigator.navigateToSitePath('courses/list', { params : { mode: 'my' } });
    }

    /**
     * Go to course categories.
     */
    openCourseCategories(): void {
        CoreNavigator.navigateToSitePath('courses/categories');
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver.off();
        this.downloadEnabledObserver.off();
    }

}

type NewsForum = CoreCourseWSModule & {
    handlerData?: CoreCourseModuleHandlerData;
};
