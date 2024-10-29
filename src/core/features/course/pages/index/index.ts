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

import { Component, ViewChild, OnDestroy, OnInit, ElementRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { CoreTabsOutletTab, CoreTabsOutletComponent } from '@components/tabs-outlet/tabs-outlet';
import { CoreCourseFormatDelegate } from '../../services/format-delegate';
import { CoreCourseOptionsDelegate } from '../../services/course-options-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourse, CoreCourseProvider, CoreCourseWSSection } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CONTENTS_PAGE_NAME } from '@features/course/constants';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCoursesHelper, CoreCourseWithImageAndColor } from '@features/courses/services/courses-helper';
import { CoreColors } from '@singletons/colors';
import { CorePath } from '@singletons/path';
import { CoreSites } from '@services/sites';
import { CoreWait } from '@singletons/wait';

/**
 * Page that displays the list of courses the user is enrolled in.
 */
@Component({
    selector: 'page-core-course-index',
    templateUrl: 'index.html',
    styleUrl: 'index.scss',
})
export class CoreCourseIndexPage implements OnInit, OnDestroy {

    @ViewChild(CoreTabsOutletComponent) tabsComponent?: CoreTabsOutletComponent;
    @ViewChild('courseThumb') courseThumb?: ElementRef;

    title = '';
    category = '';
    course?: CoreCourseWithImageAndColor & CoreCourseAnyCourseData;
    tabs: CourseTab[] = [];
    loaded = false;
    progress?: number;
    fullScreenEnabled = false;

    protected currentPagePath = '';
    protected fullScreenObserver: CoreEventObserver;
    protected selectTabObserver: CoreEventObserver;
    protected progressObserver: CoreEventObserver;
    protected sections: CoreCourseWSSection[] = []; // List of course sections.
    protected firstTabName?: string;
    protected module?: CoreCourseModuleData;
    protected modNavOptions?: CoreNavigationOptions;
    protected isGuest = false;
    protected openModule = true;
    protected contentsTab: CoreTabsOutletTab & { pageParams: Params } = {
        page: CONTENTS_PAGE_NAME,
        title: 'core.course',
        pageParams: {},
    };

    constructor(private route: ActivatedRoute) {
        this.selectTabObserver = CoreEvents.on(CoreEvents.SELECT_COURSE_TAB, (data) => {
            if (!data.name) {
                // If needed, set sectionId and sectionNumber. They'll only be used if the content tabs hasn't been loaded yet.
                if (data.sectionId) {
                    this.contentsTab.pageParams.sectionId = data.sectionId;
                }
                if (data.sectionNumber !== undefined) {
                    this.contentsTab.pageParams.sectionNumber = data.sectionNumber;
                }

                // Select course contents.
                this.tabsComponent?.selectByIndex(0);
            } else if (this.tabs) {
                const index = this.tabs.findIndex((tab) => tab.name == data.name);

                if (index >= 0) {
                    this.tabsComponent?.selectByIndex(index);
                }
            }
        });

        const siteId = CoreSites.getCurrentSiteId();

        this.progressObserver = CoreEvents.on(CoreCourseProvider.PROGRESS_UPDATED, (data) => {
            if (!this.course || this.course.id !== data.courseId || !('progress' in this.course)) {
                return;
            }

            this.course.progress = data.progress;
            this.updateProgress();
        }, siteId);

        this.fullScreenObserver = CoreEvents.on(CoreEvents.FULL_SCREEN_CHANGED, (event: { enabled: boolean }) => {
            this.fullScreenEnabled = event.enabled;
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Increase route depth.
        const path = CoreNavigator.getRouteFullPath(this.route);

        CoreNavigator.increaseRouteDepth(path.replace(/(\/deep)+/, ''));

        try {
            this.course = CoreNavigator.getRequiredRouteParam('course');
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            CoreNavigator.back();
            this.loaded = true;

            return;
        }

        this.firstTabName = CoreNavigator.getRouteParam('selectedTab');
        this.module = CoreNavigator.getRouteParam<CoreCourseModuleData>('module');
        this.isGuest = CoreNavigator.getRouteBooleanParam('isGuest') ??
            (!!this.course && (await CoreCourseHelper.courseUsesGuestAccessInfo(this.course.id)).guestAccess);

        this.modNavOptions = CoreNavigator.getRouteParam<CoreNavigationOptions>('modNavOptions');
        this.openModule = CoreNavigator.getRouteBooleanParam('openModule') ?? true; // If false, just scroll to module.
        this.currentPagePath = CoreNavigator.getCurrentPath();
        this.contentsTab.page = CorePath.concatenatePaths(this.currentPagePath, this.contentsTab.page);
        this.contentsTab.pageParams = {
            course: this.course,
            sectionId: CoreNavigator.getRouteNumberParam('sectionId'),
            sectionNumber: CoreNavigator.getRouteNumberParam('sectionNumber'),
            blockInstanceId: CoreNavigator.getRouteNumberParam('blockInstanceId'),
            isGuest: this.isGuest,
        };

        if (this.module) {
            this.contentsTab.pageParams.moduleId = this.module.id;
            if (!this.contentsTab.pageParams.sectionId && this.contentsTab.pageParams.sectionNumber === undefined) {
                // No section specified, use module section.
                this.contentsTab.pageParams.sectionId = this.module.section;
            }
        }

        this.tabs.push(this.contentsTab);
        this.loaded = true;

        await Promise.all([
            this.loadCourseHandlers(),
            this.loadBasinInfo(),
        ]);
    }

    /**
     * A tab was selected.
     */
    tabSelected(): void {
        if (!this.module || !this.course || !this.openModule) {
            return;
        }
        // Now that the first tab has been selected we can load the module.
        CoreCourseHelper.openModule(this.module, this.course.id, {
            sectionId: this.contentsTab.pageParams.sectionId,
            modNavOptions: this.modNavOptions,
        });

        delete this.module;
    }

    /**
     * Load course option handlers.
     *
     * @returns Promise resolved when done.
     */
    protected async loadCourseHandlers(): Promise<void> {
        if (!this.course) {
            return;
        }

        // Load the course handlers.
        const handlers = await CoreCourseOptionsDelegate.getHandlersToDisplay(this.course, false, this.isGuest);

        let tabToLoad: number | undefined;

        // Create the full path.
        handlers.forEach((handler, index) => {
            handler.data.page = CorePath.concatenatePaths(this.currentPagePath, handler.data.page);
            handler.data.pageParams = handler.data.pageParams || {};

            // Check if this handler should be the first selected tab.
            if (this.firstTabName && handler.name == this.firstTabName) {
                tabToLoad = index + 1;
            }
        });

        this.tabs = [...this.tabs, ...handlers.map(handler => ({
            ...handler.data,
            name: handler.name,
        }))];

        // Select the tab if needed.
        this.firstTabName = undefined;
        if (tabToLoad) {
            await CoreWait.nextTick();

            this.tabsComponent?.selectByIndex(tabToLoad);
        }
    }

    /**
     * Load title for the page.
     *
     * @returns Promise resolved when done.
     */
    protected async loadBasinInfo(): Promise<void> {
        if (!this.course) {
            return;
        }

        // Get the title to display initially.
        this.title = CoreCourseFormatDelegate.getCourseTitle(this.course);

        await this.setCourseColor();

        this.updateProgress();

        // Load sections.
        this.sections = await CoreUtils.ignoreErrors(CoreCourse.getSections(this.course.id, false, true), []);

        if (!this.sections) {
            return;
        }

        // Get the title again now that we have sections.
        this.title = CoreCourseFormatDelegate.getCourseTitle(this.course, this.sections);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        const path = CoreNavigator.getRouteFullPath(this.route);

        CoreNavigator.decreaseRouteDepth(path.replace(/(\/deep)+/, ''));
        this.selectTabObserver?.off();
        this.progressObserver?.off();
        this.fullScreenObserver?.off();
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.tabsComponent?.ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.tabsComponent?.ionViewDidLeave();
    }

    /**
     * Open the course summary
     */
    openCourseSummary(): void {
        if (this.course) {
            CoreCourseHelper.openCourseSummary(this.course);
        }
    }

    /**
     * Update course progress.
     */
    protected updateProgress(): void {
        if (
            !this.course ||
                !('progress' in this.course) ||
                typeof this.course.progress !== 'number' ||
                this.course.progress < 0 ||
                this.course.completionusertracked === false
        ) {
            this.progress = undefined;

            return;
        }

        this.progress = this.course.progress;
    }

    /**
     * Set course color.
     */
    protected async setCourseColor(): Promise<void> {
        if (!this.course) {
            return;
        }

        await CoreCoursesHelper.loadCourseColorAndImage(this.course);

        if (!this.courseThumb) {
            return;
        }

        if (this.course.color) {
            this.courseThumb.nativeElement.style.setProperty('--course-color', this.course.color);

            const tint = CoreColors.lighter(this.course.color, 50);
            this.courseThumb.nativeElement.style.setProperty('--course-color-tint', tint);
        } else if(this.course.colorNumber !== undefined) {
            this.courseThumb.nativeElement.classList.add('course-color-' + this.course.colorNumber);
        }
    }

}

type CourseTab = CoreTabsOutletTab & {
    name?: string;
};
