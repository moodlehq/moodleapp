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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, Content, NavParams } from 'ionic-angular';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { TranslateService } from '@ngx-translate/core';

/**
 * Page that displays the amount of file storage used by each activity on the course, and allows
 * the user to delete these files.
 */
@IonicPage({ segment: 'addon-storagemanager-course-storage' })
@Component({
    selector: 'page-addon-storagemanager-course-storage',
    templateUrl: 'course-storage.html',
})
export class AddonStorageManagerCourseStoragePage {
    @ViewChild(Content) content: Content;

    course: any;
    loaded: boolean;
    sections: any;
    totalSize: number;

    constructor(navParams: NavParams,
            private courseProvider: CoreCourseProvider,
            private prefetchDelegate: CoreCourseModulePrefetchDelegate,
            private courseHelperProvider: CoreCourseHelperProvider,
            private domUtils: CoreDomUtilsProvider,
            private translate: TranslateService) {

        this.course = navParams.get('course');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.courseProvider.getSections(this.course.id, false, true).then((sections) => {
            this.courseHelperProvider.addHandlerDataForModules(sections, this.course.id);
            this.sections = sections;
            this.totalSize = 0;

            const allPromises = [];
            this.sections.forEach((section) => {
                section.totalSize = 0;
                section.modules.forEach((module) => {
                    module.parentSection = section;
                    module.totalSize = 0;
                    // Note: This function only gets the size for modules which are downloadable.
                    // For other modules it always returns 0, even if they have downloaded some files.
                    // However there is no 100% reliable way to actually track the files in this case.
                    // You can maybe guess it based on the component and componentid.
                    // But these aren't necessarily consistent, for example mod_frog vs mmaModFrog.
                    // There is nothing enforcing correct values.
                    // Most modules which have large files are downloadable, so I think this is sufficient.
                    const promise = this.prefetchDelegate.getModuleDownloadedSize(module, this.course.id).
                        then((size) => {
                            // There are some cases where the return from this is not a valid number.
                            if (!isNaN(size)) {
                                module.totalSize = Number(size);
                                section.totalSize += size;
                                this.totalSize += size;
                            }
                        });
                    allPromises.push(promise);
                });
            });

            Promise.all(allPromises).then(() => {
                this.loaded = true;
            });
        });
    }

    /**
     * The user has requested a delete for the whole course data.
     *
     * (This works by deleting data for each module on the course that has data.)
     */
    deleteForCourse(): void {
        const modules = [];
        this.sections.forEach((section) => {
            section.modules.forEach((module) => {
                if (module.totalSize > 0) {
                    modules.push(module);
                }
            });
        });

        this.deleteModules(modules);
    }

    /**
     * The user has requested a delete for a section's data.
     *
     * (This works by deleting data for each module in the section that has data.)
     *
     * @param section Section object with information about section and modules
     */
    deleteForSection(section: any): void {
        const modules = [];
        section.modules.forEach((module) => {
            if (module.totalSize > 0) {
                modules.push(module);
            }
        });

        this.deleteModules(modules);
    }

    /**
     * The user has requested a delete for a module's data
     *
     * @param module Module details
     */
    deleteForModule(module: any): void {
        if (module.totalSize > 0) {
            this.deleteModules([module]);
        }
    }

    /**
     * Deletes the specified modules, showing the loading overlay while it happens.
     *
     * @param modules Modules to delete
     * @return Promise<void> Once deleting has finished
     */
    protected deleteModules(modules: any[]): Promise<void> {
        const modal = this.domUtils.showModalLoading();

        const promises = [];
        modules.forEach((module) => {
            // Remove the files.
            const promise = this.prefetchDelegate.removeModuleFiles(module, this.course.id).then(() => {
                // When the files are removed, update the size.
                module.parentSection.totalSize -= module.totalSize;
                this.totalSize -= module.totalSize;
                module.totalSize = 0;
            });
            promises.push(promise);
        });

        return Promise.all(promises).then(() => {
            modal.dismiss();
        }).catch((error) => {
            modal.dismiss();

            this.domUtils.showErrorModalDefault(error, this.translate.instant('core.errordeletefile'));
        });
    }
}
