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

import { Component, ElementRef, Input, OnInit, ViewChild, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DomSanitizer, ModalController, Translate } from '@singletons';
import { CoreMath } from '@singletons/math';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { CoreSwiper } from '@singletons/swiper';
import { SafeResourceUrl } from '@angular/platform-browser';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Modal component to view an image.
 */
@Component({
    selector: 'core-viewer-image',
    templateUrl: 'image.html',
    styleUrl: 'image.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CoreViewerImageComponent implements OnInit {

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

    @Input() title = ''; // Modal title.
    @Input() image = ''; // Image URL.
    @Input() component?: string; // Component to use in external-content.
    @Input() componentId?: string | number; // Component ID to use in external-content.

    dataUrl?: SafeResourceUrl;

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
     * @inheritdoc
     */
    ngOnInit(): void {
        this.title = this.title || Translate.instant('core.imageviewer');

        if (this.image.startsWith('data:')) {
            // It's a data image, sanitize it so it can be rendered.
            // Don't sanitize other images because they load fine and they need to be treated by core-external-content.
            this.dataUrl = DomSanitizer.bypassSecurityTrustResourceUrl(this.image);
        }
    }

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
        zoomIn
            ? zoomRatio *= 2
            : zoomRatio /= 2;

        zoomRatio = CoreMath.clamp(zoomRatio, CoreViewerImageComponent.MIN_RATIO, CoreViewerImageComponent.MAX_RATIO);

        this.swiper.zoom.in(zoomRatio);
    }

}
