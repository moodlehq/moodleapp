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

import { Constructor } from '@/core/utils/types';
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CoreModalComponent } from '@classes/modal-component';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreModals } from '@services/modals';
import { CoreWait } from '@singletons/wait';
import { AngularFrameworkDelegate } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';

@Component({
    selector: 'core-sheet-modal',
    templateUrl: 'sheet-modal.html',
    styleUrl: 'sheet-modal.scss',
})
export class CoreSheetModalComponent<T extends CoreModalComponent> implements AfterViewInit {

    @Input({ required: true }) component!: Constructor<T>;
    @Input() componentProps?: Record<string, unknown>;
    @ViewChild('wrapper') wrapper?: ElementRef<HTMLElement>;

    private element: HTMLElement;
    private wrapperElement = new CorePromisedValue<HTMLElement>();
    private content?: HTMLElement;

    constructor({ nativeElement: element }: ElementRef<HTMLElement>) {
        this.element = element;

        CoreDirectivesRegistry.register(element, this);
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        if (!this.wrapper) {
            this.wrapperElement.reject(new Error('CoreSheetModalComponent wasn\'t mounted properly'));

            return;
        }

        this.wrapperElement.resolve(this.wrapper.nativeElement);
    }

    /**
     * Show modal.
     *
     * @returns Component instance.
     */
    async show(): Promise<T> {
        const wrapper = await this.wrapperElement;
        this.content = await AngularFrameworkDelegate.attachViewToDom(wrapper, this.component, this.componentProps ?? {});

        await CoreWait.nextTick();

        this.element.classList.add('active');
        this.element.style.zIndex = `${20000 + CoreModals.getTopOverlayIndex()}`;

        await CoreWait.nextTick();
        await CoreWait.wait(300);

        const instance = CoreDirectivesRegistry.resolve(this.content, this.component);

        if (!instance) {
            throw new Error('Modal not mounted properly');
        }

        return instance;
    }

    /**
     * Hide modal.
     */
    async hide(): Promise<void> {
        const wrapper = await this.wrapperElement;

        this.element.classList.remove('active');

        await CoreWait.nextTick();
        await CoreWait.wait(300);
        await AngularFrameworkDelegate.removeViewFromDom(wrapper, this.content);
    }

}
