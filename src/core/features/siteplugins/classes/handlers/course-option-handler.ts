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

import { Md5 } from 'ts-md5';

import {
    CoreCourseOptionsHandler,
    CoreCourseOptionsHandlerData,
    CoreCourseOptionsMenuHandlerData,
} from '@features/course/services/course-options-delegate';
import { CoreCourseAnyCourseData, CoreCourseAnyCourseDataWithOptions } from '@features/courses/services/courses';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsCourseOptionHandlerData,
    CoreSitePluginsPlugin,
} from '@features/siteplugins/services/siteplugins';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CorePromisedValue } from '@classes/promised-value';

/**
 * Handler to display a site plugin in course options.
 */
export class CoreSitePluginsCourseOptionHandler extends CoreSitePluginsBaseHandler implements CoreCourseOptionsHandler {

    priority: number;
    isMenuHandler: boolean;

    protected updatingDefer?: CorePromisedValue<void>;

    constructor(
        name: string,
        protected title: string,
        protected plugin: CoreSitePluginsPlugin,
        protected handlerSchema: CoreSitePluginsCourseOptionHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.priority = handlerSchema.priority || 0;
        this.isMenuHandler = !!handlerSchema.ismenuhandler;
    }

    /**
     * @inheritdoc
     */
    async isEnabledForCourse(courseId: number): Promise<boolean> {
        // Wait for "init" result to be updated.
        if (this.updatingDefer) {
            await this.updatingDefer;
        }

        return CoreSitePlugins.isHandlerEnabledForCourse(
            courseId,
            this.handlerSchema.restricttoenrolledcourses,
            this.initResult?.restrict,
        );
    }

    /**
     * @inheritdoc
     */
    getDisplayData(): CoreCourseOptionsHandlerData {
        return {
            title: this.title,
            class: this.handlerSchema.displaydata?.class,
            page: `siteplugins/${this.name}`,
            pageParams: {},
        };
    }

    /**
     * @inheritdoc
     */
    getMenuDisplayData(course: CoreCourseAnyCourseDataWithOptions): CoreCourseOptionsMenuHandlerData {
        const args = {
            courseid: course.id,
        };
        const hash = Md5.hashAsciiStr(JSON.stringify(args));

        return {
            title: this.title,
            class: this.handlerSchema.displaydata?.class,
            icon: this.handlerSchema.displaydata?.icon || '',
            page: `siteplugins/content/${this.plugin.component}/${this.handlerSchema.method}/${hash}`,
            pageParams: {
                title: this.title,
                args,
                initResult: this.initResult,
                ptrEnabled: this.handlerSchema.ptrenabled,
            },
        };
    }

    /**
     * @inheritdoc
     */
    prefetch(course: CoreCourseAnyCourseData): Promise<void> {
        const args = {
            courseid: course.id,
        };
        const component = this.plugin.component;

        return CoreSitePlugins.prefetchFunctions(component, args, this.handlerSchema, course.id, undefined, true);
    }

    /**
     * Set init result.
     *
     * @param result Result to set.
     */
    setInitResult(result: CoreSitePluginsContent | null): void {
        this.initResult = result;

        this.updatingDefer?.resolve();
        delete this.updatingDefer;
    }

    /**
     * Mark init being updated.
     */
    updatingInit(): void {
        this.updatingDefer = new CorePromisedValue();
    }

}
