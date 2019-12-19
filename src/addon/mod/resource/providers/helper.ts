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

import { Injectable } from '@angular/core';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseHelperProvider } from '@core/course/providers/helper';
import { AddonModResourceProvider } from './resource';
import { CoreSitesProvider } from '@providers/sites';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreFileProvider } from '@providers/file';
import { CoreAppProvider } from '@providers/app';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Service that provides helper functions for resources.
 */
@Injectable()
export class AddonModResourceHelperProvider {

    /* Constants to determine how a resource should be displayed in Moodle. */
    // Try the best way.
    protected DISPLAY_AUTO = 0;
    // Display using object tag.
    protected DISPLAY_EMBED = 1;

    constructor(private courseProvider: CoreCourseProvider, private domUtils: CoreDomUtilsProvider,
            private resourceProvider: AddonModResourceProvider, private courseHelper: CoreCourseHelperProvider,
            private textUtils: CoreTextUtilsProvider, private mimetypeUtils: CoreMimetypeUtilsProvider,
            private fileProvider: CoreFileProvider, private appProvider: CoreAppProvider,
            private filepoolProvider: CoreFilepoolProvider, private sitesProvider: CoreSitesProvider) {
    }

    /**
     * Get the HTML to display an embedded resource.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @return Promise resolved with the HTML.
     */
    getEmbeddedHtml(module: any, courseId: number): Promise<any> {
        return this.courseHelper.downloadModuleWithMainFileIfNeeded(module, courseId, AddonModResourceProvider.COMPONENT,
                module.id, module.contents).then((result) => {
            return this.mimetypeUtils.getEmbeddedHtml(module.contents[0], result.path);
        });
    }

    /**
     * Download all the files needed and returns the src of the iframe.
     *
     * @param module The module object.
     * @return Promise resolved with the iframe src.
     */
    getIframeSrc(module: any): Promise<string> {
        if (!module.contents.length) {
            return Promise.reject(null);
        }

        const mainFile = module.contents[0];
        let mainFilePath = mainFile.filename;

        if (mainFile.filepath !== '/') {
            mainFilePath = mainFile.filepath.substr(1) + mainFilePath;
        }

        return this.filepoolProvider.getPackageDirUrlByUrl(this.sitesProvider.getCurrentSiteId(), module.url).then((dirPath) => {
            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return this.textUtils.concatenatePaths(dirPath, mainFilePath);
        }).catch(() => {
            // Error getting directory, there was an error downloading or we're in browser. Return online URL.
            if (this.appProvider.isOnline() && mainFile.fileurl) {
                // This URL is going to be injected in an iframe, we need this to make it work.
                return this.sitesProvider.getCurrentSite().checkAndFixPluginfileURL(mainFile.fileurl);
            }

            return Promise.reject(null);
        });
    }

    /**
     * Whether the resource has to be displayed embedded.
     *
     * @param module The module object.
     * @param display The display mode (if available).
     * @return Whether the resource should be displayed embeded.
     */
    isDisplayedEmbedded(module: any, display: number): boolean {
        if ((!module.contents.length && !module.contentsinfo) || !this.fileProvider.isAvailable() ||
                (!this.sitesProvider.getCurrentSite().isVersionGreaterEqualThan('3.7') && this.isNextcloudFile(module))) {
            return false;
        }

        let ext;

        if (module.contentsinfo) {
            ext = this.mimetypeUtils.getExtension(module.contentsinfo.mimetypes[0]);
        } else {
            ext = this.mimetypeUtils.getFileExtension(module.contents[0].filename);
        }

        return (display == this.DISPLAY_EMBED || display == this.DISPLAY_AUTO) && this.mimetypeUtils.canBeEmbedded(ext);
    }

    /**
     * Whether the resource has to be displayed in an iframe.
     *
     * @param module The module object.
     * @return Whether the resource should be displayed in an iframe.
     */
    isDisplayedInIframe(module: any): boolean {
        if ((!module.contents.length && !module.contentsinfo) || !this.fileProvider.isAvailable()) {
            return false;
        }

        let mimetype;

        if (module.contentsinfo) {
            mimetype = module.contentsinfo.mimetypes[0];
        } else {
            const ext = this.mimetypeUtils.getFileExtension(module.contents[0].filename);
            mimetype = this.mimetypeUtils.getMimeType(ext);
        }

        return mimetype == 'text/html';
    }

    /**
     * Check if the resource is a Nextcloud file.
     *
     * @param module Module to check.
     * @return Whether it's a Nextcloud file.
     */
    isNextcloudFile(module: any): boolean {
        if (module.contentsinfo) {
            return module.contentsinfo.repositorytype == 'nextcloud';
        }

        return module.contents && module.contents[0] && module.contents[0].repositorytype == 'nextcloud';
    }

    /**
     * Opens a file of the resource activity.
     *
     * @param module Module where to get the contents.
     * @param courseId Course Id, used for completion purposes.
     * @return Resolved when done.
     */
    openModuleFile(module: any, courseId: number): Promise<any> {
        const modal = this.domUtils.showModalLoading();

        // Download and open the file from the resource contents.
        return this.courseHelper.downloadModuleAndOpenFile(module, courseId, AddonModResourceProvider.COMPONENT, module.id,
                module.contents).then(() => {
            this.resourceProvider.logView(module.instance, module.name).then(() => {
                this.courseProvider.checkModuleCompletion(courseId, module.completiondata);
            }).catch(() => {
                // Ignore errors.
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'addon.mod_resource.errorwhileloadingthecontent', true);
        }).finally(() => {
            modal.dismiss();
        });
    }
}
