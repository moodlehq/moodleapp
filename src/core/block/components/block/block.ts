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

import { Component, Input, OnInit, Injector, ViewChild, OnDestroy } from '@angular/core';
import { CoreBlockDelegate } from '../../providers/delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { Subscription } from 'rxjs';
import { CoreEventsProvider } from '@providers/events';

/**
 * Component to render a block.
 */
@Component({
    selector: 'core-block',
    templateUrl: 'core-block.html'
})
export class CoreBlockComponent implements OnInit, OnDestroy {
    @ViewChild(CoreDynamicComponent) dynamicComponent: CoreDynamicComponent;

    @Input() block: any; // The block to render.
    @Input() contextLevel: string; // The context where the block will be used.
    @Input() instanceId: number; // The instance ID associated with the context level.
    @Input() extraData: any; // Any extra data to be passed to the block.

    title: string; // The title of the block.
    componentClass: any; // The class of the component to render.
    data: any = {}; // Data to pass to the component.
    class: string; // CSS class to apply to the block.
    loaded = false;

    blockSubscription: Subscription;

    constructor(protected injector: Injector, protected blockDelegate: CoreBlockDelegate,
            protected eventsProvider: CoreEventsProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.block) {
            this.loaded = true;

            return;
        }

        // Get the data to render the block.
        this.initBlock();
    }

    /**
     * Get block display data and initialises the block once this is available. If the block is not
     * supported at the moment, try again if the available blocks are updated (because it comes
     * from a site plugin).
     */
    initBlock(): void {
        this.blockDelegate.getBlockDisplayData(this.injector, this.block, this.contextLevel, this.instanceId).then((data) => {
            if (!data) {
                // Block not supported, don't render it. But, site plugins might not have finished loading.
                // Subscribe to the observable in block delegate that will tell us if blocks are updated.
                // We can retry init later if that happens.
                this.blockSubscription = this.blockDelegate.blocksUpdateObservable.subscribe(
                    (): void => {
                        this.blockSubscription.unsubscribe();
                        delete this.blockSubscription;
                        this.initBlock();
                    }
                );

                return;
            }

            this.title = data.title;
            this.class = data.class;
            this.componentClass = data.component;

            // Set up the data needed by the block component.
            this.data = Object.assign({
                    block: this.block,
                    contextLevel: this.contextLevel,
                    instanceId: this.instanceId,
                }, this.extraData || {}, data.componentData || {});
        }).catch(() => {
            // Ignore errors.
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * On destroy of the component, clear up any subscriptions.
     */
    ngOnDestroy(): void {
        if (this.blockSubscription) {
            this.blockSubscription.unsubscribe();
            delete this.blockSubscription;
        }
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] Refresher. Please pass this only if the refresher should finish when this function finishes.
     * @param {Function} [done] Function to call when done.
     * @param {boolean} [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    doRefresh(refresher?: any, done?: () => void, showErrors: boolean = false): Promise<any> {
        if (this.dynamicComponent) {
            return Promise.resolve(this.dynamicComponent.callComponentFunction('doRefresh', [refresher, done, showErrors]));
        }

        return Promise.resolve();
    }

    /**
     * Invalidate some data.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    invalidate(): Promise<any> {
        if (this.dynamicComponent) {
            return Promise.resolve(this.dynamicComponent.callComponentFunction('invalidateContent'));
        }

        return Promise.resolve();
    }
}
