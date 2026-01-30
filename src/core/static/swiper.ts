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

import { ElementRef } from '@angular/core';
import { IonicSlides } from '@ionic/angular';
import { CorePlatform } from '@services/platform';
import Swiper from 'swiper';
import { SwiperOptions } from 'swiper/types';

/**
 * Static class with helper functions for SwiperJS.
 */
export class CoreSwiper {

    // Avoid creating instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Initialize a Swiper instance.
     * It will return swiper instance if current is not set or destroyed and new is set and not destroyed.
     *
     * @param currentSwiper Current Swiper instance.
     * @param newSwiperRef New Swiper Element Ref.
     * @param swiperOpts Swiper options.
     * @returns Initialized Swiper instance.
     */
    static initSwiperIfAvailable(
        currentSwiper?: Swiper,
        newSwiperRef?: ElementRef,
        swiperOpts?: SwiperOptions,
    ): Swiper | undefined {
        const swiper = newSwiperRef?.nativeElement?.swiper as Swiper | undefined;
        if (!swiper || swiper.destroyed || (currentSwiper && !currentSwiper.destroyed)) {
            return;
        }

        Swiper.use([IonicSlides]);

        CoreSwiper.updateOptions(swiper, swiperOpts);

        swiper.changeLanguageDirection(CorePlatform.isRTL ? 'rtl' : 'ltr');

        return swiper;
    }

    /**
     * Update Swiper options.
     *
     * @param swiper Swiper instance.
     * @param swiperOpts Swiper options.
     */
    static updateOptions(swiper: Swiper, swiperOpts?: SwiperOptions): void {
        if (!swiperOpts) {
            return;
        }

        Object.assign(swiper.el, swiperOpts);

        swiper.update();
    }

}
