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
import { CoreCourse, CoreCourseAnyModuleData } from '@features/course/services/course';
import { CoreCourseHelper, CoreCourseModuleData } from '@features/course/services/course-helper';
import { CoreNetwork } from '@services/network';
import { CoreFile } from '@services/file';
import { CoreFileHelper } from '@services/file-helper';
import { CoreFilepool } from '@services/filepool';
import { CoreSites } from '@services/sites';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { makeSingleton, Translate } from '@singletons';
import { CorePath } from '@singletons/path';
import { AddonModResource, AddonModResourceCustomData } from './resource';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreText } from '@singletons/text';
import { CoreTimeUtils } from '@services/utils/time';
import { ADDON_MOD_RESOURCE_COMPONENT } from '../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreOpenerOpenFileOptions } from '@singletons/opener';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Service that provides helper functions for resources.
 */
@Injectable({ providedIn: 'root' })
export class AddonModResourceHelperProvider {

    /**
     * Get the HTML to display an embedded resource.
     *
     * @param module The module object.
     * @returns Promise resolved with the HTML.
     */
    async getEmbeddedHtml(module: CoreCourseModuleData): Promise<string> {
        const contents = await CoreCourse.getModuleContents(module);

        const result = await CoreCourseHelper.downloadModuleWithMainFileIfNeeded(
            module,
            module.course,
            ADDON_MOD_RESOURCE_COMPONENT,
            module.id,
            contents,
        );

        return CoreMimetypeUtils.getEmbeddedHtml(contents[0], result.path);
    }

    /**
     * Download all the files needed and returns the src of the iframe.
     *
     * @param module The module object.
     * @returns Promise resolved with the iframe src.
     */
    async getIframeSrc(module: CoreCourseModuleData): Promise<string> {
        if (!module.contents?.length || module.url === undefined) {
            throw new CoreError('No contents available in module');
        }

        const mainFile = module.contents[0];
        let mainFilePath = mainFile.filename;

        if (mainFile.filepath !== '/') {
            mainFilePath = mainFile.filepath.substring(1) + mainFilePath;
        }

        try {
            const dirPath = await CoreFilepool.getPackageDirUrlByUrl(CoreSites.getCurrentSiteId(), module.url);

            // This URL is going to be injected in an iframe, we need trustAsResourceUrl to make it work in a browser.
            return CorePath.concatenatePaths(dirPath, mainFilePath);
        } catch (e) {
            // Error getting directory, there was an error downloading or we're in browser. Return online URL.
            if (CoreNetwork.isOnline() && mainFile.fileurl) {
                // This URL is going to be injected in an iframe, we need this to make it work.
                return CoreSites.getRequiredCurrentSite().checkAndFixPluginfileURL(mainFile.fileurl);
            }

            throw e;
        }
    }

    /**
     * Whether the resource has to be displayed embedded.
     *
     * @param module The module object.
     * @param display The display mode (if available).
     * @returns Whether the resource should be displayed embeded.
     */
    isDisplayedEmbedded(module: CoreCourseModuleData, display: number): boolean {
        const currentSite = CoreSites.getCurrentSite();

        if (!CoreFile.isAvailable() ||
                (currentSite && !currentSite.isVersionGreaterEqualThan('3.7') && this.isNextcloudFile(module))) {
            return false;
        }

        let ext: string | undefined;
        if (module.contentsinfo) {
            ext = CoreMimetypeUtils.getExtension(module.contentsinfo.mimetypes[0]);
        } else if (module.contents?.length) {
            ext = CoreMimetypeUtils.getFileExtension(module.contents[0].filename);
        } else {
            return false;
        }

        return (display == CoreConstants.RESOURCELIB_DISPLAY_EMBED || display == CoreConstants.RESOURCELIB_DISPLAY_AUTO) &&
            CoreMimetypeUtils.canBeEmbedded(ext);
    }

    /**
     * Whether the resource has to be displayed in an iframe.
     *
     * @param module The module object.
     * @returns Whether the resource should be displayed in an iframe.
     */
    isDisplayedInIframe(module: CoreCourseModuleData): boolean {
        if (!CoreFile.isAvailable()) {
            return false;
        }

        let mimetype: string | undefined;

        if (module.contentsinfo) {
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
     * @returns Promise resolved with boolean: whether main file is downloadable.
     */
    async isMainFileDownloadable(module: CoreCourseModuleData, siteId?: string): Promise<boolean> {
        const contents = await CoreCourse.getModuleContents(module);
        if (!contents.length) {
            throw new CoreError(Translate.instant('core.filenotfound'));
        }

        siteId = siteId || CoreSites.getCurrentSiteId();

        const mainFile = contents[0];
        const timemodified = CoreFileHelper.getFileTimemodified(mainFile);

        return CoreFilepool.isFileDownloadable(siteId, mainFile.fileurl, timemodified);
    }

    /**
     * Check if the resource is a Nextcloud file.
     *
     * @param module Module to check.
     * @returns Whether it's a Nextcloud file.
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
     * @returns Resolved when done.
     */
    async openModuleFile(module: CoreCourseModuleData, courseId: number, options: CoreOpenerOpenFileOptions = {}): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            // Download and open the file from the resource contents.
            await CoreCourseHelper.downloadModuleAndOpenFile(
                module,
                courseId,
                ADDON_MOD_RESOURCE_COMPONENT,
                module.id,
                module.contents,
                undefined,
                options,
            );

            try {
                await AddonModResource.logView(module.instance, module.name);
                CoreCourse.checkModuleCompletion(courseId, module.completiondata);
            } catch {
                // Ignore errors.
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'mod_resource_view_resource',
                name: module.name,
                data: { id: module.instance, category: 'resource' },
                url: `/mod/resource/view.php?id=${module.id}`,
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_resource.errorwhileloadingthecontent') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Get resource show options.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @returns Resource options.
     */
    protected async getModuleOptions(module: CoreCourseModuleData, courseId: number): Promise<AddonModResourceCustomData> {
        if (module.customdata !== undefined) {
            const customData: { displayoptions: string } | string = CoreText.parseJSON(module.customdata);
            const displayOptions = typeof customData === 'object' ? customData.displayoptions : customData;

            return CoreText.unserialize(displayOptions);
        }

        // Get the resource data. Legacy version (from 3.5 to 3.6.6)
        const info = await AddonModResource.getResourceData(courseId, module.id);
        const options: AddonModResourceCustomData = CoreText.unserialize(info.displayoptions);

        if (!module.contents?.[0] || options.filedetails !== undefined) {
            // Contents attribute should be loaded at this point and it's needed to get mainFile.
            // Filedetails won't be usually loaded, but if it's there's no need to check mainFile.

            return options;
        }

        // Fill filedetails checking files in contents.
        options.filedetails = {};

        const files = module.contents;
        const mainFile = files[0];

        if (options.showsize) {
            options.filedetails.size = files.reduce((result, file) => result + (file.filesize || 0), 0);
        }

        if (options.showtype) {
            options.filedetails.type = CoreMimetypeUtils.getMimetypeDescription(mainFile);
        }

        if (options.showdate) {
            const timecreated = 'timecreated' in mainFile ? mainFile.timecreated : 0;

            if ((mainFile.timemodified || 0) > timecreated + CoreConstants.SECONDS_MINUTE * 5) {
                /* Modified date may be up to several minutes later than uploaded date just because
                    teacher did not submit the form promptly. Give teacher up to 5 minutes to do it. */
                options.filedetails.modifieddate = mainFile.timemodified || 0;
            } else {
                options.filedetails.uploadeddate = timecreated;
            }
        }

        return options;
    }

    /**
     * Get afterlink details to be shown on the activity card.
     *
     * @param module The module object.
     * @param courseId The course ID.
     * @returns Description string to be shown on the activity card.
     */
    async getAfterLinkDetails(
        module: CoreCourseModuleData,
        courseId: number,
    ): Promise<string> {
        const options = await this.getModuleOptions(module, courseId);

        if (!options.filedetails) {
            return '';
        }

        const details = options.filedetails;

        const extra: string[] = [];

        if (options.showsize && details.size) {
            extra.push(CoreText.bytesToSize(details.size, 1));
        }

        if (options.showtype) {
            // The order of this if conditions should not be changed.
            if (details.extension) {
                // From LMS 4.3 onwards only extension is shown.
                extra.push(details.extension);
            } else if (details.mimetype) {
                // Mostly used from 3.7 to 4.2.
                extra.push(CoreMimetypeUtils.getMimetypeDescription(details.mimetype));
            } else if (details.type) {
                // Used on 3.5 and 3.6 where mimetype populated on getModuleOptions using main file.
                extra.push(details.type); // Already translated.
            }
        }

        if (options.showdate) {
            if (details.modifieddate) {
                extra.push(Translate.instant(
                    'addon.mod_resource.modifieddate',
                    { $a: CoreTimeUtils.userDate(details.modifieddate * 1000, 'core.strftimedatetimeshort') },
                ));
            } else if (details.uploadeddate) {
                extra.push(Translate.instant(
                    'addon.mod_resource.uploadeddate',
                    { $a: CoreTimeUtils.userDate(details.uploadeddate * 1000, 'core.strftimedatetimeshort') },
                ));
            }
        }

        return extra.join(' · ');
    }

}
export const AddonModResourceHelper = makeSingleton(AddonModResourceHelperProvider);
