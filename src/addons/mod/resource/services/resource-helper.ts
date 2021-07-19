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
import { Injectable } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreCourse, CoreCourseAnyModuleData, CoreCourseWSModule } from '@features/course/services/course';
import { CoreCourseHelper } from '@features/course/services/course-helper';
import { CoreApp } from '@services/app';
import { CoreFile } from '@services/file';
import { CoreFileHelper } from '@services/file-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtilsOpenFileOptions } from '@services/utils/utils';
import { makeSingleton } from '@singletons';
import { AddonModResource, AddonModResourceProvider } from './resource';

/**
 * Service that provides helper functions for resources.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourceHelperProvider {

    /**
     * Get the HTML to display an embedded resource.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @return Promise resolved with the HTML.
     */
    async getEmbeddedHtml(module: CoreCourseWSModule, courseId: number): Promise<string> {
        const result = await CoreCourseHelper.downloadModuleWithMainFileIfNeeded(
            module,
            courseId,
            AddonModResourceProvider.COMPONENT,
            module.id,
            module.contents,
        );

        return CoreMimetypeUtils.getEmbeddedHtml(module.contents[0], result.path);
    }

    /**
     * Download all the files needed and returns the src of the iframe.
     *
     * @param module The module object.
     * @return Promise resolved with the iframe src.
     */
    async getIframeSrc(module: CoreCourseWSModule): Promise<string> {
        if (!module.contents.length) {
            throw new CoreError('No contents available in module');
        }

        const mainFile = module.contents[0];
        let mainFilePath = mainFile.filename;

        if (mainFile.filepath !== '/') {
            mainFilePath = mainFile.filepath.substr(1) + mainFilePath;
        }

        try {
            const dirPath = await CoreFilepool.getPackageDirUrlByUrl(CoreSites.getCurrentSiteId(), module.url!);

            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return CoreTextUtils.concatenatePaths(dirPath, mainFilePath);
        } catch (e) {
            // Error getting directory, there was an error downloading or we're in browser. Return online URL.
            if (CoreApp.isOnline() && mainFile.fileurl) {
                // This URL is going to be injected in an iframe, we need this to make it work.
                return CoreSites.getCurrentSite()!.checkAndFixPluginfileURL(mainFile.fileurl);
            }

            throw e;
        }
    }

    /**
     * Whether the resource has to be displayed embedded.
     *
     * @param module The module object.
     * @param display The display mode (if available).
     * @return Whether the resource should be displayed embeded.
     */
    isDisplayedEmbedded(module: CoreCourseWSModule, display: number): boolean {
        const currentSite = CoreSites.getCurrentSite();

        if ((!module.contents.length && !module.contentsinfo) ||
            !CoreFile.isAvailable() ||
            (currentSite && !currentSite.isVersionGreaterEqualThan('3.7') && this.isNextcloudFile(module))) {
            return false;
        }

        const ext = module.contentsinfo
            ? CoreMimetypeUtils.getExtension(module.contentsinfo.mimetypes[0])
            : CoreMimetypeUtils.getFileExtension(module.contents[0].filename);

        return (display == CoreConstants.RESOURCELIB_DISPLAY_EMBED || display == CoreConstants.RESOURCELIB_DISPLAY_AUTO) &&
            CoreMimetypeUtils.canBeEmbedded(ext);
    }

    /**
     * Whether the resource has to be displayed in an iframe.
     *
     * @param module The module object.
     * @return Whether the resource should be displayed in an iframe.
     */
    isDisplayedInIframe(module: CoreCourseAnyModuleData): boolean {
        if (!CoreFile.isAvailable()) {
            return false;
        }

        let mimetype: string | undefined;

        if ('contentsinfo' in module && module.contentsinfo) {
            mimetype = module.contentsinfo.mimetypes[0];
        } else if (module.contents) {
            const ext = CoreMimetypeUtils.getFileExtension(module.contents[0].filename);
            mimetype = CoreMimetypeUtils.getMimeType(ext);
        } else {
            return false;
        }

        return mimetype == 'text/html' || mimetype == 'application/xhtml+xml';
    }

    /**
     * Check if main file of resource is downloadable.
     *
     * @param module Module instance.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with boolean: whether main file is downloadable.
     */
    isMainFileDownloadable(module: CoreCourseWSModule, siteId?: string): Promise<boolean> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        const mainFile = module.contents[0];
        const timemodified = CoreFileHelper.getFileTimemodified(mainFile);

        return CoreFilepool.isFileDownloadable(siteId, mainFile.fileurl, timemodified);
    }

    /**
     * Check if the resource is a Nextcloud file.
     *
     * @param module Module to check.
     * @return Whether it's a Nextcloud file.
     */
    isNextcloudFile(module: CoreCourseAnyModuleData): boolean {
        if ('contentsinfo' in module && module.contentsinfo) {
            return module.contentsinfo.repositorytype == 'nextcloud';
        }

        return !!(module.contents && module.contents[0] && module.contents[0].repositorytype == 'nextcloud');
    }

    /**
     * Opens a file of the resource activity.
     *
     * @param module Module where to get the contents.
     * @param courseId Course Id, used for completion purposes.
     * @param options Options to open the file.
     * @return Resolved when done.
     */
    async openModuleFile(module: CoreCourseWSModule, courseId: number, options: CoreUtilsOpenFileOptions = {}): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            // Download and open the file from the resource contents.
            await CoreCourseHelper.downloadModuleAndOpenFile(
                module,
                courseId,
                AddonModResourceProvider.COMPONENT,
                module.id,
                module.contents,
                undefined,
                options,
            );

            try {
                await AddonModResource.logView(module.instance!, module.name);
                CoreCourse.checkModuleCompletion(courseId, module.completiondata);
            } catch {
                // Ignore errors.
            }
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'addon.mod_resource.errorwhileloadingthecontent', true);
        } finally {
            modal.dismiss();
        }
    }

}
export const AddonModResourceHelper = makeSingleton(AddonModResourceHelperProvider);
