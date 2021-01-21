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
import { Params } from '@angular/router';

import { CoreTab, CoreTabsComponent } from '@components/tabs/tabs';
import { CoreCourseFormatDelegate } from '../../services/format-delegate';
import { CoreCourseOptionsDelegate } from '../../services/course-options-delegate';
import { CoreCourseAnyCourseData } from '@features/courses/services/courses';
import { CoreEventObserver, CoreEvents, CoreEventSelectCourseTabData } from '@singletons/events';
import { CoreCourse, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays the list of courses the user is enrolled in.
 */
@Component({
    selector: 'page-core-course-index',
    templateUrl: 'index.html',
})
export class CoreCourseIndexPage implements OnInit, OnDestroy {

    @ViewChild(CoreTabsComponent) tabsComponent?: CoreTabsComponent;

    title?: string;
    course?: CoreCourseAnyCourseData;
    tabs: CourseTab[] = [];
    loaded = false;

    protected currentPagePath = '';
    protected selectTabObserver: CoreEventObserver;
    protected firstTabName?: string;
    protected contentsTab: CoreTab = {
        page: 'contents',
        title: 'core.course.contents',
        pageParams: {},
    };

    constructor() {
        this.selectTabObserver = CoreEvents.on<CoreEventSelectCourseTabData>(CoreEvents.SELECT_COURSE_TAB, (data) => {
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
                    this.tabsComponent?.selectByIndex(index + 1);
                }
            }
        });
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        // Get params.
        this.course = CoreNavigator.instance.getRouteParam('course');
        this.firstTabName = CoreNavigator.instance.getRouteParam('selectedTab');
        const module = CoreNavigator.instance.getRouteParam<CoreCourseWSModule>('module');
        const modParams = CoreNavigator.instance.getRouteParam<Params>('modParams');

        this.currentPagePath = CoreNavigator.instance.getCurrentPath();
        this.contentsTab.page = CoreTextUtils.instance.concatenatePaths(this.currentPagePath, this.contentsTab.page);
        this.contentsTab.pageParams = {
            course: this.course,
            sectionId: CoreNavigator.instance.getRouteParam<number>('sectionId'),
            sectionNumber: CoreNavigator.instance.getRouteParam<number>('sectionNumber'),
        };

        if (module) {
            this.contentsTab.pageParams!.moduleId = module.id;
            CoreCourseHelper.instance.openModule(module, this.course!.id, this.contentsTab.pageParams!.sectionId, modParams);
        }

        this.tabs.push(this.contentsTab);
        this.loaded = true;

        await Promise.all([
            this.loadCourseHandlers(),
            this.loadTitle(),
        ]);
    }

    /**
     * Load course option handlers.
     *
     * @return Promise resolved when done.
     */
    protected async loadCourseHandlers(): Promise<void> {
        // Load the course handlers.
        const handlers = await CoreCourseOptionsDelegate.instance.getHandlersToDisplay(this.course!, false, false);

        this.tabs.concat(handlers.map(handler => handler.data));

        let tabToLoad: number | undefined;

        // Add the courseId to the handler component data.
        handlers.forEach((handler, index) => {
            handler.data.page = CoreTextUtils.instance.concatenatePaths(this.currentPagePath, handler.data.page);
            handler.data.pageParams = handler.data.pageParams || {};
            handler.data.pageParams.courseId = this.course!.id;

            // Check if this handler should be the first selected tab.
            if (this.firstTabName && handler.name == this.firstTabName) {
                tabToLoad = index + 1;
            }
        });

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
        this.title =  CoreCourseFormatDelegate.instance.getCourseTitle(this.course!);

        // Load sections.
        const sections = await CoreUtils.instance.ignoreErrors(CoreCourse.instance.getSections(this.course!.id, false, true));

        if (!sections) {
            return;
        }

        // Get the title again now that we have sections.
        this.title = CoreCourseFormatDelegate.instance.getCourseTitle(this.course!, sections);
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
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

type CourseTab = CoreTab & {
    name?: string;
};
