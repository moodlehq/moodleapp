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

import { Directive, ElementRef, OnInit } from '@angular/core';

/**
 * Directive to enabled scroll events on ALL scrollable ion-content.
 *
 * Example usage:
 *
 * <ion-content>
 */
@Directive({
    selector: 'ion-content',
})
export class CoreContentDirective implements OnInit {

    protected element: HTMLIonContentElement;

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (this.element.classList.contains('disable-scroll-y')) {
            return;
        }

        this.element.scrollEvents = true;
    }

}
