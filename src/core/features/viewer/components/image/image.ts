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

import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { IonSlides } from '@ionic/angular';
import { ModalController, Translate } from '@singletons';
import { CoreMath } from '@singletons/math';

/**
 * Modal component to view an image.
 */
@Component({
    selector: 'core-viewer-image',
    templateUrl: 'image.html',
    styleUrls: ['image.scss'],
})
export class CoreViewerImageComponent implements OnInit, AfterViewInit {

    @ViewChild(IonSlides) protected slides?: IonSlides;

    @Input() title = ''; // Modal title.
    @Input() image = ''; // Image URL.
    @Input() component?: string; // Component to use in external-content.
    @Input() componentId?: string | number; // Component ID to use in external-content.

    slidesOpts = {
        slidesPerView: 1,
        centerInsufficientSlides: true,
        centerSlides: true,
        zoom: {
            maxRatio: 8,
            minRatio: 0.5, // User can zoom out to 0.5 only using pinch gesture.
        },
    };

    protected zoomRatio = 1;

    slidesSwiper: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    constructor(protected element: ElementRef<HTMLElement>) {
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.title = this.title || Translate.instant('core.imageviewer');
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        this.slidesSwiper = await this.slides?.getSwiper();
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

        if (!this.slidesSwiper || !imageElement) {
            return;
        }

        zoomIn
            ? this.zoomRatio *= 2
            : this.zoomRatio /= 2;

        // Using 1 as minimum for manual zoom.
        this.zoomRatio = CoreMath.clamp(this.zoomRatio, 1, this.slidesOpts.zoom.maxRatio);

        if (this.zoomRatio > 1) {
            this.slidesSwiper.zoom.in();

            imageElement.style.transform =
                'translate3d(0px, 0px, 0px) scale(' + this.zoomRatio + ')';
        } else {
            this.slidesSwiper.zoom.out();
        }
    }

}
