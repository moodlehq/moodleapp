// (C) Copyright 2015 Martin Dougiamas
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

import { Component, Injector } from '@angular/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreMimetypeUtilsProvider } from '@providers/utils/mimetype';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCourseModuleMainResourceComponent } from '@core/course/classes/main-resource-component';
import { AddonModUrlProvider } from '../../providers/url';
import { AddonModUrlHelperProvider } from '../../providers/helper';
import { CoreConstants } from '@core/constants';

/**
 * Component that displays a url.
 */
@Component({
    selector: 'addon-mod-url-index',
    templateUrl: 'addon-mod-url-index.html',
})
export class AddonModUrlIndexComponent extends CoreCourseModuleMainResourceComponent {
    component = AddonModUrlProvider.COMPONENT;

    canGetUrl: boolean;
    url: string;
    name: string;
    shouldEmbed = false;
    shouldIframe = false;
    isImage = false;
    isAudio = false;
    isVideo = false;
    isOther = false;
    mimetype: string;
    displayDescription = true;

    constructor(injector: Injector, private urlProvider: AddonModUrlProvider, private courseProvider: CoreCourseProvider,
            private urlHelper: AddonModUrlHelperProvider, private mimeUtils: CoreMimetypeUtilsProvider,
            private sitesProvider: CoreSitesProvider) {
        super(injector);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.canGetUrl = this.urlProvider.isGetUrlWSAvailable();

        this.loadContent().then(() => {
            if ((this.shouldIframe || (this.shouldEmbed && this.isOther)) ||
                    (!this.shouldIframe && (!this.shouldEmbed || !this.isOther))) {
                this.logView();
            }
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        return this.urlProvider.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download url contents.
     *
     * @param {boolean} [refresh] Whether we're refreshing data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh?: boolean): Promise<any> {
        let canGetUrl = this.canGetUrl,
            mod,
            url,
            promise;

        // Fetch the module data.
        if (canGetUrl) {
            promise = this.urlProvider.getUrl(this.courseId, this.module.id);
        } else {
            promise = Promise.reject(null);
        }

        return promise.catch(() => {
            canGetUrl = false;

            // Fallback in case is not prefetched or not available.
            return this.courseProvider.getModule(this.module.id, this.courseId, undefined, false, false, undefined, 'url');
        }).then((urlData) => {
            url = urlData;

            this.name = url.name || this.module.name;
            this.description = url.intro || url.description;
            this.dataRetrieved.emit(url);

            if (canGetUrl && url.displayoptions) {
                const unserialized = this.textUtils.unserialize(url.displayoptions);
                this.displayDescription = typeof unserialized.printintro == 'undefined' || !!unserialized.printintro;
            }

            if (!canGetUrl) {
                mod = url;

                if (!url.contents.length) {
                    // If the data was cached maybe we don't have contents. Reject.
                    return Promise.reject(null);
                }
            } else {
                mod = this.module;

                if (!mod.contents || !mod.contents.length) {
                    // Try to load module contents, it's needed to get the URL with parameters.
                    return this.courseProvider.loadModuleContents(mod, this.courseId, undefined, false, false, undefined, 'url');
                }
            }
        }).then(() => {
            // Always use the URL from the module because it already includes the parameters.
            this.url = mod.contents && mod.contents[0] && mod.contents[0].fileurl ? mod.contents[0].fileurl : undefined;

            if (canGetUrl) {
                return this.calculateDisplayOptions(url);
            }
        });
    }

    /**
     * Calculate the display options to determine how the URL should be rendered.
     *
     * @param {any} url Object with the URL data.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected calculateDisplayOptions(url: any): Promise<any> {
        const displayType = this.urlProvider.getFinalDisplayType(url);

        this.shouldEmbed = displayType == CoreConstants.RESOURCELIB_DISPLAY_EMBED;
        this.shouldIframe = displayType == CoreConstants.RESOURCELIB_DISPLAY_FRAME;

        if (this.shouldEmbed) {
            const extension = this.mimeUtils.guessExtensionFromUrl(url.externalurl);

            this.mimetype = this.mimeUtils.getMimeType(extension);
            this.isImage = this.mimeUtils.isExtensionInGroup(extension, ['web_image']);
            this.isAudio = this.mimeUtils.isExtensionInGroup(extension, ['web_audio']);
            this.isVideo = this.mimeUtils.isExtensionInGroup(extension, ['web_video']);
            this.isOther = !this.isImage && !this.isAudio && !this.isVideo;
        }

        if (this.shouldIframe || (this.shouldEmbed && !this.isImage && !this.isAudio && !this.isVideo)) {
            // Will be displayed in an iframe. Check if we need to auto-login.
            const currentSite = this.sitesProvider.getCurrentSite();

            if (currentSite && currentSite.containsUrl(this.url)) {
                // Format the URL to add auto-login.
                return currentSite.getAutoLoginUrl(this.url, false).then((url) => {
                    this.url = url;
                });
            }
        }

        return Promise.resolve();
    }

    /**
     * Log view into the site and checks module completion.
     *
     * @return {Promise<void>} Promise resolved when done.
     */
    protected logView(): Promise<void> {
        return this.urlProvider.logView(this.module.instance, this.module.name).then(() => {
            this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
        }).catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Opens a file.
     */
    go(): void {
        this.logView();
        this.urlHelper.open(this.url);
    }
}
