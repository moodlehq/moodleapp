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

import { Component, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { CoreTabsOutletTab, CoreTabsOutletComponent } from '@components/tabs-outlet/tabs-outlet';
import { CoreCourseFormatDelegate } from '../../services/format-delegate';
import { CoreCourseOptionsDelegate } from '../../services/course-options-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreCourse, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreNavigator } from '@services/navigator';
import { CONTENTS_PAGE_NAME } from '@features/course/course.module';

/**
 * Page that displays the list of courses the user is enrolled in.
 */
@Component({
    selector: 'page-core-course-index',
    templateUrl: 'index.html',
})
export class CoreCourseIndexPage implements OnInit, OnDestroy {

    @ViewChild(CoreTabsOutletComponent) tabsComponent?: CoreTabsOutletComponent;

    title?: string;
    course?: CoreCourseAnyCourseData;
    tabs: CourseTab[] = [];
    loaded = false;

    protected currentPagePath = '';
    protected selectTabObserver: CoreEventObserver;
    protected firstTabName?: string;
    protected module?: CoreCourseWSModule;
    protected modParams?: Params;
    protected contentsTab: CoreTabsOutletTab = {
        page: CONTENTS_PAGE_NAME,
        title: 'core.course.contents',
        pageParams: {},
    };

    constructor(private route: ActivatedRoute) {
        this.selectTabObserver = CoreEvents.on(CoreEvents.SELECT_COURSE_TAB, (data) => {
            if (!data.name) {
                // If needed, set sectionId and sectionNumber. They'll only be used if the content tabs hasn't been loaded yet.
                if (data.sectionId) {
                    this.contentsTab.pageParams!.sectionId = data.sectionId;
                }
                if (data.sectionNumber) {
                    this.contentsTab.pageParams!.sectionNumber = data.sectionNumber;
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
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        // Increase route depth.
        const path = CoreNavigator.getRouteFullPath(this.route.snapshot);

        CoreNavigator.increaseRouteDepth(path.replace(/(\/deep)+/, ''));

        // Get params.
        this.course = CoreNavigator.getRouteParam('course');
        this.firstTabName = CoreNavigator.getRouteParam('selectedTab');
        this.module = CoreNavigator.getRouteParam<CoreCourseWSModule>('module');
        this.modParams = CoreNavigator.getRouteParam<Params>('modParams');

        this.currentPagePath = CoreNavigator.getCurrentPath();
        this.contentsTab.page = CoreTextUtils.concatenatePaths(this.currentPagePath, this.contentsTab.page);
        this.contentsTab.pageParams = {
            course: this.course,
            sectionId: CoreNavigator.getRouteNumberParam('sectionId'),
            sectionNumber: CoreNavigator.getRouteNumberParam('sectionNumber'),
        };

        if (this.module) {
            this.contentsTab.pageParams!.moduleId = this.module.id;
        }

        this.tabs.push(this.contentsTab);
        this.loaded = true;

        await Promise.all([
            this.loadCourseHandlers(),
            this.loadTitle(),
        ]);
    }

    /**
     * A tab was selected.
     */
    tabSelected(): void {
        if (this.module) {
            // Now that the first tab has been selected we can load the module.
            CoreCourseHelper.openModule(this.module, this.course!.id, this.contentsTab.pageParams!.sectionId, this.modParams);

            delete this.module;
        }
    }

    /**
     * Load course option handlers.
     *
     * @return Promise resolved when done.
     */
    protected async loadCourseHandlers(): Promise<void> {
        // Load the course handlers.
        const handlers = await CoreCourseOptionsDelegate.getHandlersToDisplay(this.course!, false, false);

        let tabToLoad: number | undefined;

        // Create the full path.
        handlers.forEach((handler, index) => {
            handler.data.page = CoreTextUtils.concatenatePaths(this.currentPagePath, handler.data.page);
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
            setTimeout(() => {
                this.tabsComponent?.selectByIndex(tabToLoad!);
            });
        }
    }

    /**
     * Load title for the page.
     *
     * @return Promise resolved when done.
     */
    protected async loadTitle(): Promise<void> {
        // Get the title to display initially.
        this.title = CoreCourseFormatDelegate.getCourseTitle(this.course!);

        // Load sections.
        const sections = await CoreUtils.ignoreErrors(CoreCourse.getSections(this.course!.id, false, true));

        if (!sections) {
            return;
        }

        // Get the title again now that we have sections.
        this.title = CoreCourseFormatDelegate.getCourseTitle(this.course!, sections);
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        const path = CoreNavigator.getRouteFullPath(this.route.snapshot);

        CoreNavigator.decreaseRouteDepth(path.replace(/(\/deep)+/, ''));
        this.selectTabObserver?.off();
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

}

type CourseTab = CoreTabsOutletTab & {
    name?: string;
};
