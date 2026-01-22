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

import { Component, OnDestroy, Type, viewChild, effect, input, signal } from '@angular/core';
import { CoreBlockDelegate } from '../../services/block-delegate';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import { Subscription } from 'rxjs';
import { CoreCourseBlock } from '@features/course/services/course';
import type { ReloadableComponent } from '@coretypes/reloadable-component';
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
export class CoreBlockComponent implements OnDestroy {

    readonly dynamicComponent = viewChild<CoreDynamicComponent<ReloadableComponent>>(CoreDynamicComponent);

    readonly block = input.required<CoreCourseBlock>(); // The block to render.
    readonly contextLevel = input.required<ContextLevel>(); // The context where the block will be used.
    readonly instanceId = input.required<number>(); // The instance ID associated with the context level.
    readonly labelledBy = input<string>();

    /**
     * @deprecated since 5.1. Not used anymore.
     */
    readonly extraData = input<unknown>(); // Any extra data to be passed to the block.

    readonly componentClass = signal<Type<ReloadableComponent> | undefined>(undefined); // The class of the component to render.
    readonly data = signal<Record<string, unknown>>({}); // Data to pass to the component.
    readonly class = signal<string>(''); // CSS class to apply to the block.
    readonly loaded = signal(false);
    protected blockSubscription?: Subscription;

    constructor() {
        effect(() => {
            if (this.block()?.visible) {
                this.updateBlock();
            }
        });
    }

    /**
     * Get block display data and initialises or updates the block. If the block is not supported at the moment, try again if the
     * available blocks are updated (because it comes from a site plugin).
     */
    async updateBlock(): Promise<void> {
        const block = this.block();
        const contextLevel = this.contextLevel();
        const instanceId = this.instanceId();

        try {
            const data = await CoreBlockDelegate.getBlockDisplayData(block, contextLevel, instanceId);

            if (!data) {
                // Block not supported, don't render it. But, site plugins might not have finished loading.
                // Subscribe to the observable in block delegate that will tell us if blocks are updated.
                // We can retry init later if that happens.
                this.blockSubscription = CoreBlockDelegate.blocksUpdateObservable.subscribe(
                    (): void => {
                        this.blockSubscription?.unsubscribe();
                        this.updateBlock();
                    },
                );

                return;
            }

            this.class.set(data.class ?? '');
            this.componentClass.set(data.component);

            // Set up the data needed by the block component.
            this.data.update(() => Object.assign(
                {
                    title: data.title,
                    block,
                    contextLevel,
                    instanceId,
                    link: data.link || null,
                    linkParams: data.linkParams || null,
                    navOptions: data.navOptions || null,
                },
                data.componentData ?? {},
            ));
        } catch {
            // Ignore errors.
        }

        this.loaded.set(true);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.blockSubscription?.unsubscribe();
    }

    /**
     * Invalidate block data.
     */
    async invalidate(): Promise<void> {
        await this.dynamicComponent()?.callComponentMethod('invalidateContent');
    }

    /**
     * Fetch block data.
     */
    async reload(): Promise<void> {
        await this.dynamicComponent()?.callComponentMethod('reloadContent');
    }

}
