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

import { Component, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreUserTourDirectiveOptions } from '@directives/user-tour';
import { CoreUserToursAlignment, CoreUserToursSide } from '@features/usertours/services/user-tours';
import { CoreModals } from '@services/overlays/modals';
import { CoreDom } from '@singletons/dom';
import { CoreBlockSideBlocksTourComponent } from '../side-blocks-tour/side-blocks-tour';
import { ContextLevel } from '@/core/constants';

/**
 * Component that displays a button to open blocks.
 */
@Component({
    selector: 'core-block-side-blocks-button',
    templateUrl: 'side-blocks-button.html',
    styleUrl: 'side-blocks-button.scss',
})
export class CoreBlockSideBlocksButtonComponent implements OnInit, OnDestroy {

    @Input({ required: true }) contextLevel!: ContextLevel;
    @Input({ required: true }) instanceId!: number;
    @Input() myDashboardPage?: string;

    userTour: CoreUserTourDirectiveOptions = {
        id: 'side-blocks-button',
        component: CoreBlockSideBlocksTourComponent,
        side: CoreUserToursSide.Start,
        alignment: CoreUserToursAlignment.Center,
        after: 'user-menu',
        afterTimeout: 1000,
        getFocusedElement: nativeButton => {
            const innerButton = Array.from(nativeButton.shadowRoot?.children ?? []).find(child => child.tagName === 'BUTTON');

            return innerButton as HTMLElement ?? nativeButton;
        },
    };

    protected element: HTMLElement;
    protected slotPromise?: CoreCancellablePromise<void>;

    constructor(el: ElementRef) {
        this.element = el.nativeElement;
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.slotPromise = CoreDom.slotOnContent(this.element);
    }

    /**
     * Open side blocks.
     */
    async openBlocks(): Promise<void> {
        const { CoreBlockSideBlocksComponent } = await import('@features/block/components/side-blocks/side-blocks');

        CoreModals.openSideModal({
            component: CoreBlockSideBlocksComponent,
            componentProps: {
                contextLevel: this.contextLevel,
                instanceId: this.instanceId,
                myDashboardPage: this.myDashboardPage,
            },
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.slotPromise?.cancel();
    }

}
