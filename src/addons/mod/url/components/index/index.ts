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
import { Component, OnInit, Optional } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { CoreCourse } from '@features/course/services/course';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { CoreText } from '@singletons/text';
import { AddonModUrl, AddonModUrlDisplayOptions, AddonModUrlUrl } from '../../services/url';
import { AddonModUrlHelper } from '../../services/url-helper';
import { ADDON_MOD_URL_COMPONENT } from '../../constants';
import { CoreSites } from '@services/sites';

/**
 * Component that displays a url.
 */
@Component({
    selector: 'addon-mod-url-index',
    templateUrl: 'addon-mod-url-index.html',
    styleUrl: 'index.scss',
})
export class AddonModUrlIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = ADDON_MOD_URL_COMPONENT;
    pluginName = 'url';

    url?: string;
    embeddedUrl?: string;
    name?: string;
    shouldEmbed = false;
    shouldIframe = false;
    isImage = false;
    isAudio = false;
    isVideo = false;
    isOther = false;
    mimetype?: string;
    displayDescription = true;

    protected checkCompletionAfterLog = false;

    constructor(@Optional() courseContentsPage?: CoreCourseContentsPage) {
        super('AddonModUrlIndexComponent', courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent();
    }

    /**
     * Perform the invalidate content function.
     *
     * @returns Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        await AddonModUrl.invalidateContent(this.module.id, this.courseId);
    }

    /**
     * Download url contents.
     *
     * @param refresh Whether we're refreshing data.
     * @returns Promise resolved when done.
     */
    protected async fetchContent(refresh = false): Promise<void> {
        try {
            // Fetch the module data.
            const url = await AddonModUrl.getUrl(this.courseId, this.module.id);

            this.name = url.name;
            this.description = url.intro;
            this.dataRetrieved.emit(url);

            if (url.displayoptions) {
                const unserialized = CoreText.unserialize<AddonModUrlDisplayOptions>(url.displayoptions);
                this.displayDescription = unserialized.printintro === undefined || !!unserialized.printintro;
            }

            // Try to get module contents, it's needed to get the URL with parameters.
            const contents = await CoreCourse.getModuleContents(
                this.module,
                undefined,
                undefined,
                false,
                refresh,
                undefined,
                'url',
            );

            // Always use the URL from the module because it already includes the parameters.
            this.url = contents[0] && contents[0].fileurl ? contents[0].fileurl : undefined;

            await this.calculateDisplayOptions(url);

        } catch {
            // Fallback in case is not prefetched.
            const mod = await CoreCourse.getModule(this.module.id, this.courseId, undefined, false, false, undefined, 'url');

            this.name = mod.name;
            this.description = mod.description;
            this.dataRetrieved.emit(mod);

            if (!mod.contents?.length) {
                // If the data was cached maybe we don't have contents. Reject.
                throw new CoreError('No contents found in module.');
            }

            this.url = mod.contents[0].fileurl ? mod.contents[0].fileurl : undefined;
        }
    }

    /**
     * Calculate the display options to determine how the URL should be rendered.
     *
     * @param url Object with the URL data.
     * @returns Promise resolved when done.
     */
    protected async calculateDisplayOptions(url: AddonModUrlUrl): Promise<void> {
        const displayType = AddonModUrl.getFinalDisplayType(url);

        this.shouldEmbed = displayType == CoreConstants.RESOURCELIB_DISPLAY_EMBED;
        this.shouldIframe = displayType == CoreConstants.RESOURCELIB_DISPLAY_FRAME;

        if (!this.shouldEmbed) {
            return;
        }

        const extension = CoreMimetypeUtils.guessExtensionFromUrl(url.externalurl);

        this.mimetype = CoreMimetypeUtils.getMimeType(extension);
        this.isImage = CoreMimetypeUtils.isExtensionInGroup(extension, ['web_image']);
        this.isAudio = CoreMimetypeUtils.isExtensionInGroup(extension, ['web_audio']);
        this.isVideo = CoreMimetypeUtils.isExtensionInGroup(extension, ['web_video']);
        this.isOther = !this.isImage && !this.isAudio && !this.isVideo;

        // Fix the URL if it uses pluginfile endpoint.
        const currentSite = CoreSites.getCurrentSite();
        this.embeddedUrl = currentSite && this.url ?
            await currentSite.checkAndFixPluginfileURL(this.url) : '';
    }

    /**
     * Log view into the site and checks module completion.
     *
     * @returns Promise resolved when done.
     */
    protected async logView(): Promise<void> {
        try {
            await AddonModUrl.logView(this.module.instance);

            this.checkCompletion();
        } catch {
            // Ignore errors.
        }

        this.analyticsLogEvent('mod_url_view_url');
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if ((this.shouldIframe ||
            (this.shouldEmbed && this.isOther)) ||
            (!this.shouldIframe && (!this.shouldEmbed || !this.isOther))) {
            this.logView();
        }
    }

    /**
     * Opens a file.
     */
    go(): void {
        this.logView();
        if (!this.url) {
            return;
        }

        AddonModUrlHelper.open(this.url);
    }

}
