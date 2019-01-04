// (C) Copyright 2015 Martin Dougiamas
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

import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Content } from 'ionic-angular';

/**
 * Directive to move ion-fab components as direct children of the nearest ion-content.
 *
 * Example usage:
 *
 * <ion-fab core-fab>
 */
@Directive({
    selector: 'ion-fab[core-fab]'
})
export class CoreFabDirective implements OnInit, OnDestroy {
    protected element: HTMLElement;

    constructor(el: ElementRef, protected content: Content) {
        this.element = el.nativeElement;
    }

    /**
     * Initialize Component.
     */
    ngOnInit(): void {
        if (this.content) {
            this.content.getNativeElement().classList.add('has-fab');
            this.content.getFixedElement().appendChild(this.element);
        }
    }

    /**
     * Destroy component.
     */
    ngOnDestroy(): void {
        if (this.content) {
            this.content.getNativeElement().classList.remove('has-fab');
        }
    }
}
