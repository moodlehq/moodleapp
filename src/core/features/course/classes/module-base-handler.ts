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

import { CoreNavigationOptions, CoreNavigator } from '@services/navigator';
import { CoreCourseModuleHelper } from '../services/course-module-helper';
import { CoreCourseModuleData } from '../services/course-helper';
import { CoreCourseModuleHandler, CoreCourseModuleHandlerData, CoreCourseOverviewItemContent } from '../services/module-delegate';
import { CoreCourseOverviewActivity, CoreCourseOverviewItem } from '../services/course-overview';
import { CoreCourseOverviewContentType } from '../constants';

/**
 * Base module handler to be registered.
 */
export class CoreModuleHandlerBase implements Partial<CoreCourseModuleHandler> {

    protected pageName = '';

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    getData(
        module: CoreCourseModuleData,
        courseId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        sectionId?: number, // eslint-disable-line @typescript-eslint/no-unused-vars
        forCoursePage?: boolean, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<CoreCourseModuleHandlerData> | CoreCourseModuleHandlerData {
        return {
            icon: this.getIconSrc(module, module.modicon),
            title: module.name,
            class: `addon-mod_${module.modname}-handler`,
            showDownloadButton: true,
            hasCustomCmListItem: false,
            action: async (
                event: Event,
                module: CoreCourseModuleData,
                courseId: number,
                options?: CoreNavigationOptions,
            ): Promise<void> => {
                await this.openActivityPage(module, courseId, options);
            },
        };
    }

    /**
     * Opens the activity page.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @param options Options for the navigation.
     * @returns Promise resolved when done.
     */
    async openActivityPage(module: CoreCourseModuleData, courseId: number, options?: CoreNavigationOptions): Promise<void> {
        if (!CoreCourseModuleHelper.moduleHasView(module)) {
            return;
        }

        options = options || {};
        options.params = options.params || {};
        Object.assign(options.params, { module });

        const routeParams = `/${courseId}/${module.id}`;

        await CoreNavigator.navigateToSitePath(this.pageName + routeParams, options);
    }

    /**
     * @inheritdoc
     */
    getIconSrc(module?: CoreCourseModuleData, modicon?: string): Promise<string | undefined> | string | undefined {
        if (!module) {
            return modicon;
        }

        return CoreCourseModuleHelper.getModuleIconSrc(module.modname, modicon);
    }

    /**
     * @inheritdoc
     */
    async getOverviewItemContent(
        item: CoreCourseOverviewItem,
        activity: CoreCourseOverviewActivity, // eslint-disable-line @typescript-eslint/no-unused-vars
        courseId: number, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<CoreCourseOverviewItemContent | undefined> {
        // Handle items common to all modules or items using common renderables.
        if (item.key === 'name' || item.contenttype === CoreCourseOverviewContentType.ACTIVITY_NAME) {
            const { CoreCourseOverviewItemNameComponent } =
                await import('@features/course/components/overview-item-name/overview-item-name');

            return {
                component: CoreCourseOverviewItemNameComponent,
            };
        }

        if (item.key === 'completion' || item.contenttype === CoreCourseOverviewContentType.CM_COMPLETION) {
            if ('value' in item.parsedData && item.parsedData.value === null) {
                return {
                    content: null,
                };
            }

            const { CoreCourseOverviewItemCompletionComponent } =
                await import('@features/course/components/overview-item-completion/overview-item-completion');

            return {
                component: CoreCourseOverviewItemCompletionComponent,
            };
        }

        if (item.contenttype === CoreCourseOverviewContentType.HUMAN_DATE && Number(item.parsedData.timestamp)) {
            const { CoreHumanDateComponent } = await import('@components/human-date/human-date');

            return {
                component: CoreHumanDateComponent,
                componentData: {
                    timestamp: Number(item.parsedData.timestamp) * 1000,
                },
            };
        }

        if (
            item.contenttype === CoreCourseOverviewContentType.ACTION_LINK ||
            item.contenttype === CoreCourseOverviewContentType.OVERVIEW_ACTION
        ) {
            const { CoreCourseOverviewItemActionComponent } =
                await import('@features/course/components/overview-item-action/overview-item-action');

            return {
                component: CoreCourseOverviewItemActionComponent,
            };
        }

        if (item.contenttype === CoreCourseOverviewContentType.OVERVIEW_DIALOG) {
            const { CoreCourseOverviewItemDialogButtonComponent } =
                await import('@features/course/components/overview-item-dialog/overview-item-dialog-button');

            return {
                component: CoreCourseOverviewItemDialogButtonComponent,
            };
        }

        if (item.contenttype === CoreCourseOverviewContentType.BASIC) {
            // Display basic items as they are. Basic items don't use renderables, they can still contain HTML but it should
            // be displayed properly in the app because it should be standard HTML, no custom classes or similar.
            // E.g. a language string that contains HTML like <strong> or <a>.
            return {
                content: String(item.parsedData.content ?? item.parsedData.value ?? '-'),
            };
        }
    }

}
