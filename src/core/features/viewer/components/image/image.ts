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

import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ModalController, Translate } from '@singletons';
import { CoreMath } from '@singletons/math';
import { Swiper } from 'swiper';
import { SwiperOptions } from 'swiper/types';
import { IonicSlides } from '@ionic/angular';

/**
 * Modal component to view an image.
 */
@Component({
    selector: 'core-viewer-image',
    templateUrl: 'image.html',
    styleUrls: ['image.scss'],
})
export class CoreViewerImageComponent implements OnInit {

    protected swiper?: Swiper;
    @ViewChild('swiperRef')
    set swiperRef(swiperRef: ElementRef) {
        /**
         * This setTimeout waits for Ionic's async initialization to complete.
         * Otherwise, an outdated swiper reference will be used.
         */
        setTimeout(() => {
            if (swiperRef.nativeElement?.swiper) {
                this.swiper = swiperRef.nativeElement.swiper as Swiper;

                Object.keys(this.swiperOpts).forEach((key) => {
                    if (this.swiper) {
                        this.swiper.params[key] = this.swiperOpts[key];
                    }
                });
            }
        }, 0);
    }

    @Input() title = ''; // Modal title.
    @Input() image = ''; // Image URL.
    @Input() component?: string; // Component to use in external-content.
    @Input() componentId?: string | number; // Component ID to use in external-content.

    private static readonly MAX_RATIO = 8;

    protected swiperOpts: SwiperOptions = {
        modules: [IonicSlides],
        freeMode: true,
        slidesPerView: 1,
        centerInsufficientSlides: true,
        centeredSlides: true,
        zoom: {
            maxRatio: CoreViewerImageComponent.MAX_RATIO,
            minRatio: 0.5, // User can zoom out to 0.5 only using pinch gesture.
        },
    };

    protected zoomRatio = 1;

    constructor(protected element: ElementRef<HTMLElement>) {
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.title = this.title || Translate.instant('core.imageviewer');
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
        const imageElement = this.element.nativeElement.querySelector('img');

        if (!this.swiper || !imageElement) {
            return;
        }

        zoomIn
            ? this.zoomRatio *= 2
            : this.zoomRatio /= 2;

        // Using 1 as minimum for manual zoom.
        this.zoomRatio = CoreMath.clamp(this.zoomRatio, 1, CoreViewerImageComponent.MAX_RATIO);

        if (this.zoomRatio > 1) {
            this.swiper.zoom.in();

            imageElement.style.transform =
                'translate3d(0px, 0px, 0px) scale(' + this.zoomRatio + ')';
        } else {
            this.swiper.zoom.out();
        }
    }

}
