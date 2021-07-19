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

import { CoreConstants } from '@/core/constants';
import { Component, OnInit } from '@angular/core';
import { CoreCourse } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModule, CoreCourseSection } from '@features/course/services/course-helper';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreEnrolledCourseData } from '@features/courses/services/courses';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';
import { Translate } from '@singletons';

/**
 * Page that displays the amount of file storage used by each activity on the course, and allows
 * the user to delete these files.
 */
@Component({
    selector: 'page-addon-storagemanager-course-storage',
    templateUrl: 'course-storage.html',
    styleUrls: ['course-storage.scss'],
})
export class AddonStorageManagerCourseStoragePage implements OnInit {

    course!: CoreEnrolledCourseData;
    loaded = false;
    sections: AddonStorageManagerCourseSection[] = [];
    totalSize = 0;

    /**
     * View loaded.
     */
    async ngOnInit(): Promise<void> {
        this.course = CoreNavigator.getRouteParam<CoreEnrolledCourseData>('course')!;

        this.sections = await CoreCourse.getSections(this.course.id, false, true);
        CoreCourseHelper.addHandlerDataForModules(this.sections, this.course.id);

        this.totalSize = 0;

        const promises: Promise<void>[] = [];
        this.sections.forEach((section) => {
            section.totalSize = 0;
            section.modules.forEach((module) => {
                module.parentSection = section;
                module.totalSize = 0;
                module.modNameTranslated = CoreCourse.translateModuleName(module.modname) || '';

                // Note: This function only gets the size for modules which are downloadable.
                // For other modules it always returns 0, even if they have downloaded some files.
                // However there is no 100% reliable way to actually track the files in this case.
                // You can maybe guess it based on the component and componentid.
                // But these aren't necessarily consistent, for example mod_frog vs mmaModFrog.
                // There is nothing enforcing correct values.
                // Most modules which have large files are downloadable, so I think this is sufficient.
                const promise = CoreCourseModulePrefetchDelegate.getModuleStoredSize(module, this.course.id).then((size) => {
                    // There are some cases where the return from this is not a valid number.
                    if (!isNaN(size)) {
                        module.totalSize = Number(size);
                        section.totalSize! += size;
                        this.totalSize += size;
                    }

                    return;
                });
                promises.push(promise);
            });
        });

        await Promise.all(promises);
        this.loaded = true;

        if (this.totalSize == 0) {
            this.markCourseAsNotDownloaded();
        }
    }

    /**
     * The user has requested a delete for the whole course data.
     *
     * (This works by deleting data for each module on the course that has data.)
     */
    async deleteForCourse(): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm('core.course.confirmdeletestoreddata');
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modules: AddonStorageManagerModule[] = [];
        this.sections.forEach((section) => {
            section.modules.forEach((module) => {
                if (module.totalSize && module.totalSize > 0) {
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
    async deleteForSection(section: AddonStorageManagerCourseSection): Promise<void> {
        try {
            await CoreDomUtils.showDeleteConfirm('core.course.confirmdeletestoreddata');
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        const modules: AddonStorageManagerModule[] = [];
        section.modules.forEach((module) => {
            if (module.totalSize && module.totalSize > 0) {
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
    async deleteForModule(module: AddonStorageManagerModule): Promise<void> {
        if (module.totalSize === 0) {
            return;
        }

        try {
            await CoreDomUtils.showDeleteConfirm('core.course.confirmdeletestoreddata');
        } catch (error) {
            if (!CoreDomUtils.isCanceledError(error)) {
                throw error;
            }

            return;
        }

        this.deleteModules([module]);
    }

    /**
     * Deletes the specified modules, showing the loading overlay while it happens.
     *
     * @param modules Modules to delete
     * @return Promise<void> Once deleting has finished
     */
    protected async deleteModules(modules: AddonStorageManagerModule[]): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        const promises: Promise<void>[] = [];
        modules.forEach((module) => {
            // Remove the files.
            const promise = CoreCourseHelper.removeModuleStoredData(module, this.course.id).then(() => {
                // When the files and cache are removed, update the size.
                module.parentSection!.totalSize! -= module.totalSize!;
                this.totalSize -= module.totalSize!;
                module.totalSize = 0;

                return;
            });

            promises.push(promise);
        });

        try {
            await Promise.all(promises);
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, Translate.instant('core.errordeletefile'));
        } finally {
            modal.dismiss();

            // @TODO This is a workaround that should be more specific solving MOBILE-3305.
            // Also should take into account all modules are not downloaded.

            // Mark course as not downloaded if course size is 0.
            if (this.totalSize == 0) {
                this.markCourseAsNotDownloaded();
            }
        }
    }

    /**
     * Mark course as not downloaded.
     */
    protected markCourseAsNotDownloaded(): void {
        // @TODO This is a workaround that should be more specific solving MOBILE-3305.
        // Also should take into account all modules are not downloaded.
        // Check after MOBILE-3188 is integrated.

        CoreCourse.setCourseStatus(this.course.id, CoreConstants.NOT_DOWNLOADED);
    }

}

type AddonStorageManagerCourseSection = Omit<CoreCourseSection, 'modules'> & {
    totalSize?: number;
    modules: AddonStorageManagerModule[];
};

type AddonStorageManagerModule = CoreCourseModule & {
    parentSection?: AddonStorageManagerCourseSection;
    totalSize?: number;
    modNameTranslated?: string;
};
