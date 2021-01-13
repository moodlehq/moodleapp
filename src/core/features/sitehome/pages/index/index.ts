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
import { ActivatedRoute } from '@angular/router';
import { IonRefresher, NavController } from '@ionic/angular';

import { CoreSite, CoreSiteConfig } from '@classes/site';
import { CoreCourse, CoreCourseModuleBasicInfo, CoreCourseSection } from '@features/course/services/course';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSites } from '@services/sites';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreCourses, CoreCoursesProvider } from '@features//courses/services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreBlockCourseBlocksComponent } from '@features/block/components/course-blocks/course-blocks';
import { CoreCourseModuleDelegate, CoreCourseModuleHandlerData } from '@features/course/services/module-delegate';

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
    section?: CoreCourseSection & {
        hasContent?: boolean;
    };

    hasContent = false;
    items: string[] = [];
    siteHomeId = 1;
    currentSite?: CoreSite;
    searchEnabled = false;
    downloadEnabled = false;
    downloadCourseEnabled = false;
    downloadCoursesEnabled = false;
    downloadEnabledIcon = 'far-square';
    newsForumModule?: NewsForum;

    protected updateSiteObserver?: CoreEventObserver;

    constructor(
        protected route: ActivatedRoute,
        protected navCtrl: NavController,
        // @todo private prefetchDelegate: CoreCourseModulePrefetchDelegate,
    ) {}

    /**
     * Page being initialized.
     */
    ngOnInit(): void {
        const navParams = this.route.snapshot.queryParams;

        this.searchEnabled = !CoreCourses.instance.isSearchCoursesDisabledInSite();
        this.downloadCourseEnabled = !CoreCourses.instance.isDownloadCourseDisabledInSite();
        this.downloadCoursesEnabled = !CoreCourses.instance.isDownloadCoursesDisabledInSite();

        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.instance.isSearchCoursesDisabledInSite();
            this.downloadCourseEnabled = !CoreCourses.instance.isDownloadCourseDisabledInSite();
            this.downloadCoursesEnabled = !CoreCourses.instance.isDownloadCoursesDisabledInSite();

            this.switchDownload(this.downloadEnabled && this.downloadCourseEnabled && this.downloadCoursesEnabled);
        }, CoreSites.instance.getCurrentSiteId());

        this.currentSite = CoreSites.instance.getCurrentSite()!;
        this.siteHomeId = CoreSites.instance.getCurrentSiteHomeId();

        const module = navParams['module'];
        if (module) {
            // @todo const modParams = navParams.get('modParams');
            // CoreCourseHelper.instance.openModule(module, this.siteHomeId, undefined, modParams);
        }

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

        const config = this.currentSite!.getStoredConfig() || { numsections: 1, frontpageloggedin: undefined };

        this.items = await CoreSiteHome.instance.getFrontPageItems(config.frontpageloggedin);
        this.hasContent = this.items.length > 0;

        if (this.items.some((item) => item == 'NEWS_ITEMS')) {
            // Get the news forum.
            try {
                const forum = await CoreSiteHome.instance.getNewsForum();
                this.newsForumModule = await CoreCourse.instance.getModuleBasicInfo(forum.cmid);
                this.newsForumModule.handlerData = CoreCourseModuleDelegate.instance.getModuleDataFor(
                    this.newsForumModule.modname,
                    this.newsForumModule,
                    this.siteHomeId,
                    this.newsForumModule.section,
                    true,
                );
            } catch {
                // Ignore errors.
            }
        }

        try {
            const sections = await CoreCourse.instance.getSections(this.siteHomeId!, false, true);

            // Check "Include a topic section" setting from numsections.
            this.section = config.numsections ? sections.find((section) => section.section == 1) : undefined;
            if (this.section) {
                this.section.hasContent = false;
                this.section.hasContent = CoreCourseHelper.instance.sectionHasContent(this.section);
                this.hasContent = CoreCourseHelper.instance.addHandlerDataForModules(
                    [this.section],
                    this.siteHomeId,
                    undefined,
                    undefined,
                    true,
                ) || this.hasContent;
            }

            // Add log in Moodle.
            CoreCourse.instance.logView(
                this.siteHomeId!,
                undefined,
                undefined,
                this.currentSite!.getInfo()?.sitename,
            ).catch(() => {
                // Ignore errors.
            });
        } catch (error) {
            CoreDomUtils.instance.showErrorModalDefault(error, 'core.course.couldnotloadsectioncontent', true);
        }
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher?: CustomEvent<IonRefresher>): void {
        const promises: Promise<unknown>[] = [];

        promises.push(CoreCourse.instance.invalidateSections(this.siteHomeId!));
        promises.push(this.currentSite!.invalidateConfig().then(async () => {
            // Config invalidated, fetch it again.
            const config: CoreSiteConfig = await this.currentSite!.getConfig();
            this.currentSite!.setConfig(config);

            return;
        }));

        if (this.section && this.section.modules) {
            // Invalidate modules prefetch data.
            //  @todo promises.push(this.prefetchDelegate.invalidateModules(this.section.modules, this.siteHomeId));
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
                refresher?.detail.complete();
            });
        });
    }

    /**
     * Toggle download enabled.
     */
    toggleDownload(): void {
        this.switchDownload(!this.downloadEnabled);
    }

    /**
     * Convenience function to switch download enabled.
     *
     * @param enable If enable or disable.
     */
    protected switchDownload(enable: boolean): void {
        this.downloadEnabled = (this.downloadCourseEnabled || this.downloadCoursesEnabled) && enable;
        this.downloadEnabledIcon = this.downloadEnabled ? 'far-check-square' : 'far-square';
        CoreEvents.trigger(CoreCoursesProvider.EVENT_DASHBOARD_DOWNLOAD_ENABLED_CHANGED, { enabled: this.downloadEnabled });
    }

    /**
     * Open page to manage courses storage.
     */
    manageCoursesStorage(): void {
        // @todo this.navCtrl.navigateForward(['/main/home/courses/storage']);
    }

    /**
     * Go to search courses.
     */
    openSearch(): void {
        this.navCtrl.navigateForward(['/main/home/courses/search']);
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.updateSiteObserver?.off();
    }

}

type NewsForum = CoreCourseModuleBasicInfo & {
    handlerData?: CoreCourseModuleHandlerData;
};
