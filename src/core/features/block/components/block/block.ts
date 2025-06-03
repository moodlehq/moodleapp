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

import { Component, Input, ViewChild, OnDestroy, Type, OnChanges, SimpleChanges } from '@angular/core';
import { CoreBlockDelegate } from '../../services/block-delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { Subscription } from 'rxjs';
import { CoreCourseBlock } from '@features/course/services/course';
import type { ICoreBlockComponent } from '@features/block/classes/base-block-component';
import { ContextLevel } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render a block.
 */
@Component({
    selector: 'core-block',
    templateUrl: 'core-block.html',
    styleUrl: 'block.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreBlockComponent implements OnChanges, OnDestroy {

    @ViewChild(CoreDynamicComponent) dynamicComponent?: CoreDynamicComponent<ICoreBlockComponent>;

    @Input({ required: true }) block!: CoreCourseBlock; // The block to render.
    @Input({ required: true }) contextLevel!: ContextLevel; // The context where the block will be used.
    @Input({ required: true }) instanceId!: number; // The instance ID associated with the context level.
    @Input() extraData?: Record<string, unknown>; // Any extra data to be passed to the block.
    @Input() labelledBy?: string;

    componentClass?: Type<ICoreBlockComponent>; // The class of the component to render.
    data: Record<string, unknown> = {}; // Data to pass to the component.
    class?: string; // CSS class to apply to the block.
    loaded = false;
    blockSubscription?: Subscription;

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: SimpleChanges): void {
        if (changes.block && this.block?.visible) {
            this.updateBlock();
        }

        if (this.data && changes.extraData) {
            this.data = Object.assign(this.data, this.extraData || {});
        }
    }

    /**
     * Get block display data and initialises or updates the block. If the block is not supported at the moment, try again if the
     * available blocks are updated (because it comes from a site plugin).
     */
    async updateBlock(): Promise<void> {
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
                        this.updateBlock();
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
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.blockSubscription?.unsubscribe();
        delete this.blockSubscription;
    }

    /**
     * Invalidate some data.
     *
     * @returns Promise resolved when done.
     */
    async invalidate(): Promise<void> {
        if (this.dynamicComponent) {
            await this.dynamicComponent.callComponentMethod('invalidateContent');
        }
    }

}
