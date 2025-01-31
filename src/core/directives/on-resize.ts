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

import { Directive, ElementRef, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CoreUtils } from '@singletons/utils';

/**
 * Directive to listen for element resize events.
 */
@Directive({
    selector: '[onResize]',
    standalone: true,
})
export class CoreOnResizeDirective implements OnInit, OnDestroy {

    @Output() onResize = new EventEmitter();

    private element: HTMLElement;
    private resizeObserver?: ResizeObserver;
    private mutationObserver?: MutationObserver;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        'ResizeObserver' in window
            ? this.watchResize()
            : this.watchMutations();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        this.mutationObserver?.disconnect();
    }

    /**
     * Watch resize events.
     */
    private watchResize(): void {
        this.resizeObserver = new ResizeObserver(() => this.onResize.emit());

        this.resizeObserver.observe(this.element);
    }

    /**
     * Watch mutation events to detect resizing.
     */
    private watchMutations(): void {
        let size = this.getElementSize();
        const onMutation = () => {
            const newSize = this.getElementSize();

            if (newSize.width !== size.width || newSize.height !== size.height) {
                size = newSize;

                this.onResize.emit();
            }
        };

        // Debounce 20ms to let mutations resolve before checking the new size.
        this.mutationObserver = new MutationObserver(CoreUtils.debounce(onMutation, 20));

        this.mutationObserver.observe(this.element, {
            subtree: true,
            childList: true,
            characterData: true,
        });
    }

    /**
     * Get element size.
     *
     * @returns Element size.
     */
    private getElementSize(): { width: number; height: number } {
        return {
            width: this.element.clientWidth,
            height: this.element.clientHeight,
        };
    }

}
