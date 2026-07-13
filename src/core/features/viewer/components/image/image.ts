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

import { Component, ElementRef, ViewChild, CUSTOM_ELEMENTS_SCHEMA, input, computed } from '@angular/core';
import { DomSanitizer, ModalController, Translate } from '@singletons';
import { CoreMath } from '@static/math';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { CoreSwiper } from '@static/swiper';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Modal component to view an image.
 */
@Component({
    selector: 'core-viewer-image',
    templateUrl: 'image.html',
    styleUrl: 'image.scss',
    imports: [
        CoreSharedModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CoreViewerImageComponent {

    protected swiper?: Swiper;
    @ViewChild('swiperRef') set swiperRef(swiperRef: ElementRef) {
        /**
         * This setTimeout waits for Ionic's async initialization to complete.
         * Otherwise, an outdated swiper reference will be used.
         */
        setTimeout(() => {
            const swiper = CoreSwiper.initSwiperIfAvailable(this.swiper, swiperRef, this.swiperOpts);
            if (!swiper) {
                return;
            }

            this.swiper = swiper;

            this.swiper.zoom.enable();
        });
    }

    readonly title = input(Translate.instant('core.imageviewer')); // Modal title.
    readonly image = input(''); // Image URL.
    readonly imageHTMLElement = input<HTMLImageElement | HTMLPictureElement>(); // Image HTML element.

    readonly imageHTML = computed(() => {
        // Clone the image HTML element to avoid modifying the original one.
        const imageElement = this.imageHTMLElement();

        if (!imageElement) {
            return null;
        }

        // Remove classes and styles in all the cloned elements that may affect the image display in the modal.
        imageElement.className = '';
        imageElement.removeAttribute('style');
        imageElement.querySelectorAll('*').forEach((element) => {
            element.className = '';
            element.removeAttribute('style');
        });

        // Remove also style tags in the cloned element, as they may affect the image display in the modal.
        imageElement.querySelectorAll('style').forEach((style) => {
            style.remove();
        });

        return imageElement.outerHTML;
    });

    readonly component = input<string>(); // Component to use in external-content.
    readonly componentId = input<string | number>(); // Component ID to use in external-content.

    readonly dataUrl = computed(() => {
        const image = this.image();

        if (image.startsWith('data:')) {
            // It's a data image, sanitize it so it can be rendered.
            return DomSanitizer.bypassSecurityTrustResourceUrl(image);
        }

        return null;
    });

    private static readonly MAX_RATIO = 8;
    private static readonly MIN_RATIO = 0.5;

    protected swiperOpts: SwiperOptions = {
        freeMode: true,
        slidesPerView: 1,
        centerInsufficientSlides: true,
        centeredSlides: true,
        zoom: {
            maxRatio: CoreViewerImageComponent.MAX_RATIO,
            minRatio: CoreViewerImageComponent.MIN_RATIO,
            toggle: true,
        },
    };

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

    /**
     * Zoom In or Out.
     *
     * @param zoomIn True to zoom in, false to zoom out.
     */
    zoom(zoomIn = true): void {
        if (!this.swiper) {
            return;
        }

        let zoomRatio = this.swiper.zoom.scale;
        if (zoomIn) {
            zoomRatio *= 2;
        } else {
            zoomRatio /= 2;
        }

        zoomRatio = CoreMath.clamp(zoomRatio, CoreViewerImageComponent.MIN_RATIO, CoreViewerImageComponent.MAX_RATIO);

        this.swiper.zoom.in(zoomRatio);
    }

}
