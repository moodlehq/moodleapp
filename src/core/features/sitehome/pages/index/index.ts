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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CoreSite, CoreSiteConfig } from '@classes/sites/site';
import { CoreCourse, CoreCourseWSSection, sectionContentIsModule } from '@features/course/services/course';
import { CoreSites } from '@services/sites';
import { CoreSiteHome } from '@features/sitehome/services/sitehome';
import { CoreCourses } from '@features//courses/services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreBlockHelper } from '@features/block/services/block-helper';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { ContextLevel } from '@/core/constants';
import { CoreModals } from '@services/overlays/modals';
import { CoreAlerts } from '@services/overlays/alerts';
import { Translate } from '@singletons';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleComponent } from '../../../course/components/module/module';
import { CoreBlockSideBlocksButtonComponent } from '../../../block/components/side-blocks-button/side-blocks-button';

/**
 * Page that displays site home index.
 */
@Component({
    selector: 'page-core-sitehome-index',
    templateUrl: 'index.html',
    styleUrl: 'index.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseModuleComponent,
        CoreBlockSideBlocksButtonComponent,
    ],
})
export class CoreSiteHomeIndexPage implements OnInit, OnDestroy {

    dataLoaded = false;
    section?: CoreCourseWSSection & {
        hasContent?: boolean;
    };

    hasContent = false;
    hasBlocks = false;
    items: string[] = [];
    siteHomeId = 1;
    currentSite!: CoreSite;
    searchEnabled = false;
    newsForumModule?: CoreCourseModuleData;
    isModule = sectionContentIsModule;

    protected updateSiteObserver: CoreEventObserver;
    protected logView: () => void;

    constructor(protected route: ActivatedRoute) {
        // Refresh the enabled flags if site is updated.
        this.updateSiteObserver = CoreEvents.on(CoreEvents.SITE_UPDATED, () => {
            this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();
        }, CoreSites.getCurrentSiteId());

        this.logView = CoreTime.once(async () => {
            await CorePromiseUtils.ignoreErrors(CoreCourse.logView(this.siteHomeId));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_course_view_course',
                name: this.currentSite.getInfo()?.sitename ?? '',
                data: { id: this.siteHomeId, category: 'course' },
                url: '/?redirect=0',
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.searchEnabled = !CoreCourses.isSearchCoursesDisabledInSite();

        this.currentSite = CoreSites.getRequiredCurrentSite();
        this.siteHomeId = CoreSites.getCurrentSiteHomeId();

        const module = CoreNavigator.getRouteParam<CoreCourseModuleData>('module');
        if (module) {
            const modNavOptions = CoreNavigator.getRouteParam<CoreNavigationOptions>('modNavOptions');
            CoreCourseHelper.openModule(module, this.siteHomeId, { modNavOptions });
        }

        this.loadContent().finally(() => {
            this.dataLoaded = true;
        });

        this.openFocusedInstance();

        this.route.queryParams.subscribe(() => this.openFocusedInstance());
    }

    /**
     * Convenience function to fetch the data.
     *
     * @returns Promise resolved when done.
     */
    protected async loadContent(): Promise<void> {
        this.hasContent = false;

        const config = this.currentSite.getStoredConfig() || { numsections: 1, frontpageloggedin: undefined };

        this.items = await CoreSiteHome.getFrontPageItems(config.frontpageloggedin);
        this.hasContent = this.items.length > 0;

        // Get the news forum.
        if (this.items.includes('NEWS_ITEMS')) {
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
                const result = await CoreCourseHelper.addHandlerDataForModules(
                    [this.section],
                    this.siteHomeId,
                    undefined,
                    undefined,
                    true,
                );

                this.section.hasContent = result.hasContent;
                this.hasContent = result.hasContent || this.hasContent;
            }

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.course.couldnotloadsectioncontent') });
        }

        this.hasBlocks = await CoreBlockHelper.hasCourseBlocks(this.siteHomeId);
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     */
    doRefresh(refresher?: HTMLIonRefresherElement): void {
        const promises: Promise<unknown>[] = [];

        promises.push(CoreCourse.invalidateSections(this.siteHomeId));
        promises.push(this.currentSite.invalidateConfig().then(async () => {
            // Config invalidated, fetch it again.
            const config: CoreSiteConfig = await this.currentSite.getConfig();
            this.currentSite.setConfig(config);

            return;
        }));

        promises.push(CoreCourse.invalidateCourseBlocks(this.siteHomeId));

        if (this.section?.contents.length) {
            // Invalidate modules prefetch data.
            promises.push(CoreCourseModulePrefetchDelegate.invalidateModules(
                CoreCourse.getSectionsModules([this.section]),
                this.siteHomeId,
            ));
        }

        Promise.all(promises).finally(async () => {
            await this.loadContent().finally(() => {
                refresher?.complete();
            });
        });
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
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.updateSiteObserver.off();
    }

    /**
     * Check whether there is a focused instance in the page parameters and open it.
     */
    private async openFocusedInstance() {
        const blockInstanceId = CoreNavigator.getRouteNumberParam('blockInstanceId');
        if (!blockInstanceId) {
            return;
        }

        const { CoreBlockSideBlocksComponent } = await import('@features/block/components/side-blocks/side-blocks');

        CoreModals.openSideModal({
            component: CoreBlockSideBlocksComponent,
            componentProps: {
                contextLevel: ContextLevel.COURSE,
                instanceId: this.siteHomeId,
                initialBlockInstanceId: blockInstanceId,
            },
        });
    }

}
