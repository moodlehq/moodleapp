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

import { Component, Input, OnInit, ViewChild, OnDestroy, DoCheck, KeyValueDiffers, KeyValueDiffer, Type } from '@angular/core';
import { CoreBlockDelegate } from '../../services/block-delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { Subscription } from 'rxjs';
import { CoreCourseBlock } from '@/core/features/course/services/course';
import { IonRefresher } from '@ionic/angular';

/**
 * Component to render a block.
 */
@Component({
    selector: 'core-block',
    templateUrl: 'core-block.html',
    styleUrls: ['block.scss'],
})
export class CoreBlockComponent implements OnInit, OnDestroy, DoCheck {

    @ViewChild(CoreDynamicComponent) dynamicComponent?: CoreDynamicComponent;

    @Input() block!: CoreCourseBlock; // The block to render.
    @Input() contextLevel!: string; // The context where the block will be used.
    @Input() instanceId!: number; // The instance ID associated with the context level.
    @Input() extraData!: Record<string, unknown>; // Any extra data to be passed to the block.

    componentClass?: Type<unknown>; // The class of the component to render.
    data: Record<string, unknown> = {}; // Data to pass to the component.
    class?: string; // CSS class to apply to the block.
    loaded = false;

    blockSubscription?: Subscription;

    protected differ: KeyValueDiffer<unknown, unknown>; // To detect changes in the data input.

    constructor(
        differs: KeyValueDiffers,
    ) {
        this.differ = differs.find([]).create();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.block) {
            this.loaded = true;

            return;
        }

        if (this.block.visible) {
            // Get the data to render the block.
            this.initBlock();
        }
    }

    /**
     * Detect and act upon changes that Angular can’t or won’t detect on its own (objects and arrays).
     */
    ngDoCheck(): void {
        if (this.data) {
            // Check if there's any change in the extraData object.
            const changes = this.differ.diff(this.extraData);
            if (changes) {
                this.data = Object.assign(this.data, this.extraData || {});
            }
        }
    }

    /**
     * Get block display data and initialises the block once this is available. If the block is not
     * supported at the moment, try again if the available blocks are updated (because it comes
     * from a site plugin).
     */
    async initBlock(): Promise<void> {
        try {
            const data = await CoreBlockDelegate.getBlockDisplayData(this.block, this.contextLevel, this.instanceId);

            if (!data) {
                // Block not supported, don't render it. But, site plugins might not have finished loading.
                // Subscribe to the observable in block delegate that will tell us if blocks are updated.
                // We can retry init later if that happens.
                this.blockSubscription = CoreBlockDelegate.blocksUpdateObservable.subscribe(
                    (): void => {
                        this.blockSubscription?.unsubscribe();
                        delete this.blockSubscription;
                        this.initBlock();
                    },
                );

                return;
            }

            this.class = data.class;
            this.componentClass = data.component;

            // Set up the data needed by the block component.
            this.data = Object.assign({
                title: data.title,
                block: this.block,
                contextLevel: this.contextLevel,
                instanceId: this.instanceId,
                link: data.link || null,
                linkParams: data.linkParams || null,
                navOptions: data.navOptions || null,
            }, this.extraData || {}, data.componentData || {});
        } catch {
            // Ignore errors.
        }

        this.loaded = true;
    }

    /**
     * On destroy of the component, clear up any subscriptions.
     */
    ngOnDestroy(): void {
        this.blockSubscription?.unsubscribe();
        delete this.blockSubscription;
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher. Please pass this only if the refresher should finish when this function finishes.
     * @param done Function to call when done.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    async doRefresh(
        refresher?: IonRefresher,
        done?: () => void,
        showErrors: boolean = false,
    ): Promise<void> {
        if (this.dynamicComponent) {
            await this.dynamicComponent.callComponentFunction('doRefresh', [refresher, done, showErrors]);
        }
    }

    /**
     * Invalidate some data.
     *
     * @return Promise resolved when done.
     */
    async invalidate(): Promise<void> {
        if (this.dynamicComponent) {
            await this.dynamicComponent.callComponentFunction('invalidateContent');
        }
    }

}
