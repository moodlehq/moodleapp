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

import { Injector } from '@angular/core';
import { CoreCourseFormatHandler } from '@core/course/providers/format-delegate';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { CoreSitePluginsCourseFormatComponent } from '../../components/course-format/course-format';

/**
 * Handler to support a course format using a site plugin.
 */
export class CoreSitePluginsCourseFormatHandler extends CoreSitePluginsBaseHandler implements CoreCourseFormatHandler {

    constructor(name: string, public format: string, protected handlerSchema: any) {
        super(name);
    }

    /**
     * Whether it allows seeing all sections at the same time. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether it can view all sections.
     */
    canViewAllSections(course: any): boolean {
        return typeof this.handlerSchema.canviewallsections != 'undefined' ? this.handlerSchema.canviewallsections : true;
    }

    /**
     * Whether the option to enable section/module download should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the option to enable section/module download should be displayed.
     */
    displayEnableDownload(course: any): boolean {
        return typeof this.handlerSchema.displayenabledownload != 'undefined' ? this.handlerSchema.displayenabledownload : true;
    }

    /**
     * Whether the default section selector should be displayed. Defaults to true.
     *
     * @param course The course to check.
     * @return Whether the default section selector should be displayed.
     */
    displaySectionSelector(course: any): boolean {
        return typeof this.handlerSchema.displaysectionselector != 'undefined' ? this.handlerSchema.displaysectionselector : true;
    }

    /**
     * Return the Component to use to display the course format instead of using the default one.
     * Use it if you want to display a format completely different from the default one.
     * If you want to customize the default format there are several methods to customize parts of it.
     * It's recommended to return the class of the component, but you can also return an instance of the component.
     *
     * @param injector Injector.
     * @param course The course to render.
     * @return The component (or promise resolved with component) to use, undefined if not found.
     */
    getCourseFormatComponent(injector: Injector, course: any): any | Promise<any> {
        if (this.handlerSchema.method) {
            return CoreSitePluginsCourseFormatComponent;
        }
    }
}
