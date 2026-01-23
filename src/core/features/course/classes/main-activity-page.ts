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

import { Component, OnInit, Signal } from '@angular/core';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreCourseModuleData, CoreCourseHelper } from '../services/course-helper';
import { CoreCourseModuleMainResourceComponent } from './main-resource-component';
import { CoreModals } from '@services/modals';
import { CoreCourse } from '../services/course';
import { CoreCourseIndexSectionWithModule } from '../components/course-index/course-index';

/**
 * Template class to easily create CoreCourseModuleMainComponent of resources (or activities without syncing).
 */
@Component({
    template: '',
})
export class CoreCourseModuleMainActivityPage<ActivityType extends CoreCourseModuleMainResourceComponent> implements OnInit {

    /**
     * Activity component.
     * This should be overridden with a viewChild in the child classes.
     */
    readonly activityComponent!: Signal<ActivityType>;

    title!: string;
    module!: CoreCourseModuleData;
    courseId!: number;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        console.log('[MainActivityPage] ngOnInit called');
        
        try {
            this.module = CoreNavigator.getRequiredRouteParam<CoreCourseModuleData>('module');
            console.log('[MainActivityPage] Module loaded:', this.module?.id, this.module?.name);
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            console.log('[MainActivityPage] Course ID:', this.courseId);
        } catch (error) {
            console.error('[MainActivityPage] Error getting route params:', error);
            CoreDomUtils.showErrorModal(error);

            CoreNavigator.back();

            return;
        }

        this.title = this.module.name;
    }

    /**
     * Update some data based on the activity instance.
     *
     * @param activity Activity instance.
     */
    updateData(activity: { name: string}): void {
        this.title = activity.name || this.title;
    }

    /**
     * User entered the page.
     */
    ionViewDidEnter(): void {
        this.activityComponent().ionViewDidEnter();
    }

    /**
     * User left the page.
     */
    ionViewDidLeave(): void {
        this.activityComponent().ionViewDidLeave();
    }

    /**
     * User will enter the page.
     */
    ionViewWillEnter(): void {
        this.activityComponent().ionViewWillEnter();
    }

    /**
     * User will leave the page.
     */
    ionViewWillLeave(): void {
        this.activityComponent().ionViewWillLeave();
    }

    /**
     * Open course index modal.
     */
    async openCourseIndex(): Promise<void> {
        console.log('openCourseIndex called', this.courseId, this.module);
        try {
            // Get course sections first
            const sections = await CoreCourse.getSections(this.courseId, false, true);
            const courseResult = await CoreCourseHelper.getCourse(this.courseId);

            const { CoreCourseCourseIndexComponent } = await import('../components/course-index/course-index');

            const data = await CoreModals.openModal<CoreCourseIndexSectionWithModule>({
                component: CoreCourseCourseIndexComponent,
                initialBreakpoint: 1,
                breakpoints: [0, 1],
                componentProps: {
                    course: courseResult.course,
                    sections,
                    selectedId: this.module.section,
                },
            });

            if (!data) {
                return;
            }

            // Navigate to the selected section/module
            if (data.moduleId) {
                // Navigate to the specific module
                await CoreCourseHelper.navigateToModule(data.moduleId, {
                    courseId: this.courseId,
                    sectionId: data.sectionId,
                });
            } else {
                // Navigate to section
                await CoreNavigator.navigate(`/main/home/course/${this.courseId}`, {
                    params: {
                        selectedTab: 'course',
                        sectionId: data.sectionId,
                    },
                });
            }
        } catch (error) {
            console.error('Error opening course index:', error);
            CoreDomUtils.showErrorModal(error);
        }
    }

}
