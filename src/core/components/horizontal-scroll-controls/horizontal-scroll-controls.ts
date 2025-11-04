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

import { Component, input, signal } from '@angular/core';
import { CorePlatform } from '@services/platform';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';

const enum ScrollPosition {
    START = 'start',
    END = 'end',
    MIDDLE = 'middle',
    HIDDEN = 'hidden',
}

@Component({
    selector: 'core-horizontal-scroll-controls',
    templateUrl: 'core-horizontal-scroll-controls.html',
    styleUrl: './horizontal-scroll-controls.scss',
    imports: [
        CoreBaseModule,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFaIconDirective,
    ],
})
export class CoreHorizontalScrollControlsComponent {

    // eslint-disable-next-line @angular-eslint/no-input-rename
    readonly targetId = input<string>(undefined, { alias: 'aria-controls' });

    readonly scrollPosition = signal<ScrollPosition>(ScrollPosition.HIDDEN);

    /**
     * Get target element.
     *
     * @returns The target element or null.
     */
    private get target(): HTMLElement | null {
        const targetId = this.targetId();

        return targetId && document.getElementById(targetId) || null;
    }

    /**
     * Scroll the target in the given direction.
     *
     * @param ev Click event
     * @param direction Scroll direction.
     */
    scroll(ev: Event, direction: 'forward' | 'backward'): void {
        if (!this.target) {
            return;
        }

        ev.stopPropagation();
        ev.preventDefault();

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
        this.scrollPosition.set(this.getScrollPosition(scrollLeft));
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
            return CorePlatform.isRTL ? ScrollPosition.END : ScrollPosition.START;
        }

        if (!CorePlatform.isRTL && this.target.scrollWidth - scrollLeft === this.target.clientWidth) {
            return ScrollPosition.END;
        }

        if (CorePlatform.isRTL && this.target.scrollWidth + scrollLeft === this.target.clientWidth) {
            return ScrollPosition.START;
        }

        return ScrollPosition.MIDDLE;
    }

}
