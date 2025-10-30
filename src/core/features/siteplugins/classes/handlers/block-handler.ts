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

import { Type } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import type { ReloadableComponent } from '@coretypes/reloadable-component';
import { CoreBlockDelegate, CoreBlockHandler, CoreBlockHandlerData } from '@features/block/services/block-delegate';
import { CoreCourseBlock } from '@features/course/services/course';
import { CoreSitePluginsBlockHandlerData, CoreSitePluginsContent } from '@features/siteplugins/services/siteplugins';
import { CoreLogger } from '@singletons/logger';
import { CoreSitePluginsBaseHandler } from './base-handler';
import { ContextLevel } from '@/core/constants';

/**
 * Handler to support a block using a site plugin.
 */
export class CoreSitePluginsBlockHandler extends CoreSitePluginsBaseHandler implements CoreBlockHandler {

    protected logger: CoreLogger;

    constructor(
        name: string,
        public title: string,
        public blockName: string,
        protected handlerSchema: CoreSitePluginsBlockHandlerData,
        protected initResult: CoreSitePluginsContent | null,
    ) {
        super(name);

        this.logger = CoreLogger.getInstance('CoreSitePluginsBlockHandler');
    }

    /**
     * @inheritdoc
     */
    async getDisplayData(
        block: CoreCourseBlock,
        contextLevel: ContextLevel,
        instanceId: number,
    ): Promise<CoreBlockHandlerData> {
        const className = this.handlerSchema.displaydata?.class || `block_${block.name}`;
        let component: Type<ReloadableComponent> | undefined;

        if (this.handlerSchema.displaydata?.type === 'title') {
            const { CoreSitePluginsOnlyTitleBlockComponent } =
                await import('@features/siteplugins/components/only-title-block/only-title-block');
            component = CoreSitePluginsOnlyTitleBlockComponent;
        } else if (this.handlerSchema.displaydata?.type === 'prerendered') {
            const { CoreBlockPreRenderedComponent } =
                await import('@features/block/components/pre-rendered-block/pre-rendered-block');
            component = CoreBlockPreRenderedComponent;
        } else if (this.handlerSchema.fallback && !this.handlerSchema.method) {
            // Try to use the fallback block.
            const originalName = block.name;
            block.name = this.handlerSchema.fallback;

            try {
                const displayData = await CoreBlockDelegate.getBlockDisplayData(block, contextLevel, instanceId);

                if (!displayData) {
                    throw new CoreError('Cannot get display data for fallback block.');
                }

                this.logger.debug(`Using fallback "${this.handlerSchema.fallback}" for block "${originalName}"`);
                component = displayData.component;
            } catch (error) {
                this.logger.error(`Error using fallback "${this.handlerSchema.fallback}" for block "${originalName}", ` +
                        'maybe it doesn\'t exist or isn\'t enabled.', error);

                throw error;
            }
        } else {
            const { CoreSitePluginsBlockComponent } = await import('@features/siteplugins/components/block/block');
            component = CoreSitePluginsBlockComponent;
        }

        return {
            title: this.title,
            class: className,
            component,
        };
    }

}
