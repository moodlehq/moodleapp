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

import { Component, Input } from '@angular/core';
import { Platform } from '@singletons';

const enum ScrollPosition {
    START = 'start',
    END = 'end',
    MIDDLE = 'middle',
    HIDDEN = 'hidden',
}

@Component({
    selector: 'core-horizontal-scroll-controls',
    templateUrl: 'core-horizontal-scroll-controls.html',
    styleUrls: ['./horizontal-scroll-controls.scss'],
})
export class CoreHorizontalScrollControlsComponent {

    // eslint-disable-next-line @angular-eslint/no-input-rename
    @Input('aria-controls') targetId?: string;

    scrollPosition: ScrollPosition = ScrollPosition.HIDDEN;

    /**
     * Get target element.
     */
    private get target(): HTMLElement | null {
        return this.targetId && document.getElementById(this.targetId) || null;
    }

    /**
     * Scroll the target in the given direction.
     *
     * @param direction Scroll direction.
     */
    scroll(direction: 'forward' | 'backward'): void {
        if (!this.target) {
            return;
        }

        const leftDelta = direction === 'forward' ? this.target.clientWidth : -this.target.clientWidth;
        const newScrollLeft = Math.max(
            Math.min(
                this.target.scrollLeft + leftDelta,
                this.target.scrollWidth - this.target.clientWidth,
            ),
            0,
        );

        this.target.scrollBy({
            left: leftDelta,
            behavior: 'smooth',
        });

        this.updateScrollPosition(newScrollLeft);
    }

    /**
     * Update the current scroll position.
     */
    updateScrollPosition(scrollLeft?: number): void {
        this.scrollPosition = this.getScrollPosition(scrollLeft);
    }

    /**
     * Get the current scroll position.
     *
     * @param scrollLeft Scroll left to use for reference in the calculations.
     * @returns Scroll position.
     */
    private getScrollPosition(scrollLeft?: number): ScrollPosition {
        scrollLeft = scrollLeft ?? this.target?.scrollLeft ?? 0;

        if (!this.target || this.target.scrollWidth <= this.target.clientWidth) {
            return ScrollPosition.HIDDEN;
        }

        if (scrollLeft === 0) {
            return Platform.isRTL ? ScrollPosition.END : ScrollPosition.START;
        }

        if (!Platform.isRTL && this.target.scrollWidth - scrollLeft === this.target.clientWidth) {
            return ScrollPosition.END;
        }

        if (Platform.isRTL && this.target.scrollWidth + scrollLeft === this.target.clientWidth) {
            return ScrollPosition.START;
        }

        return ScrollPosition.MIDDLE;
    }

}
