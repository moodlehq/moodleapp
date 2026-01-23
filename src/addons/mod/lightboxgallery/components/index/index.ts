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

import { Component, OnInit } from '@angular/core';
import { CoreCourseModuleMainResourceComponent } from '@features/course/classes/main-resource-component';
import { CoreCourse } from '@features/course/services/course';
import { CoreSites } from '@services/sites';
import { CoreUserParent } from '@features/user/services/parent';
import { ADDON_MOD_LIGHTBOXGALLERY_COMPONENT } from '../../constants';

interface GalleryImage {
    filename: string;
    fileurl: string;
    thumburl: string;
    mimetype: string;
    filesize: number;
    timemodified: number;
    caption: string;
}

interface LightboxGalleryResponse {
    images: GalleryImage[];
    galleryname: string;
    intro: string;
}

/**
 * Component that displays a lightbox gallery.
 */
@Component({
    selector: 'addon-mod-lightboxgallery-index',
    templateUrl: 'addon-mod-lightboxgallery-index.html',
    styleUrls: ['index.scss'],
})
export class AddonModLightboxGalleryIndexComponent extends CoreCourseModuleMainResourceComponent implements OnInit {

    component = ADDON_MOD_LIGHTBOXGALLERY_COMPONENT;
    images: GalleryImage[] = [];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();
        await this.loadContent();
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return;
        }

        try {
            // Check if viewing as a mentee (parent mode)
            const selectedMentee = await CoreUserParent.getSelectedMentee();
            const params: { cmid: number; userid?: number } = { cmid: this.module.id };

            if (selectedMentee) {
                params.userid = selectedMentee;
            }

            // Use custom web service to get lightboxgallery images
            const result = await site.read<LightboxGalleryResponse>(
                'local_aspireparent_get_lightboxgallery_images',
                params,
            );

            this.images = result.images;
            this.description = result.intro || this.module.description;

        } catch (error) {
            console.error('[LightboxGallery] Error fetching images:', error);
            this.images = [];
        }

        this.dataRetrieved.emit(this.module);
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        await CoreCourse.invalidateModule(this.module.id);
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        this.analyticsLogEvent('mod_lightboxgallery_view');
    }

    /**
     * Get the image URL with token for authenticated access.
     */
    getImageUrl(image: GalleryImage): string {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return image.fileurl;
        }
        return site.fixPluginfileURL(image.fileurl);
    }

    /**
     * Get the thumbnail URL with token.
     */
    getThumbUrl(image: GalleryImage): string {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return image.thumburl;
        }
        return site.fixPluginfileURL(image.thumburl);
    }

    /**
     * Open image in full screen.
     */
    openImage(image: GalleryImage): void {
        const url = this.getImageUrl(image);
        window.open(url, '_blank');
    }

}
