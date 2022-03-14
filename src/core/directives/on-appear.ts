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

import { Directive, ElementRef, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreSingleTimeEventObserver } from '@singletons/events';

/**
 * Directive to listen when an element becomes visible.
 */
@Directive({
    selector: '[onAppear]',
})
export class CoreOnAppearDirective implements OnInit, OnDestroy {

    @Output() onAppear = new EventEmitter();

    private element: HTMLElement;
    protected domListener?: CoreSingleTimeEventObserver;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.domListener = CoreDomUtils.waitToBeInDOM(this.element);
        await this.domListener.promise;

        this.onAppear.emit();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.domListener?.off();
    }

}
