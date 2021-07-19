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

import { OnInit, Input, Component, Optional, Inject } from '@angular/core';
import { CoreLogger } from '@singletons/logger';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreTextUtils } from '@services/utils/text';
import { CoreCourseBlock } from '../../course/services/course';
import { IonRefresher } from '@ionic/angular';
import { Params } from '@angular/router';
import { ContextLevel } from '@/core/constants';
import { CoreNavigationOptions } from '@services/navigator';

/**
 * Template class to easily create components for blocks.
 */
@Component({
    template: '',
})
export abstract class CoreBlockBaseComponent implements OnInit {

    @Input() title!: string; // The block title.
    @Input() block!: CoreCourseBlock; // The block to render.
    @Input() contextLevel!: ContextLevel; // The context where the block will be used.
    @Input() instanceId!: number; // The instance ID associated with the context level.
    @Input() link?: string; // Link to go when clicked.
    @Input() linkParams?: Params; // Link params to go when clicked.
    @Input() navOptions?: CoreNavigationOptions; // Navigation options.

    loaded = false; // If the component has been loaded.
    protected fetchContentDefaultError = ''; // Default error to show when loading contents.

    protected logger: CoreLogger;

    constructor(@Optional() @Inject('') loggerName: string = 'AddonBlockComponent') {
        this.logger = CoreLogger.getInstance(loggerName);
    }

    /**
     * Component being initialized.
     */
    async ngOnInit(): Promise<void> {
        if (this.block.configs && this.block.configs.length > 0) {
            this.block.configs.map((config) => {
                config.value = CoreTextUtils.parseJSON(config.value);

                return config;
            });

            this.block.configsRecord = CoreUtils.arrayToObject(this.block.configs, 'name');
        }

        await this.loadContent();
    }

    /**
     * Refresh the data.
     *
     * @param refresher Refresher.
     * @param done Function to call when done.
     * @param showErrors If show errors to the user of hide them.
     * @return Promise resolved when done.
     */
    async doRefresh(refresher?: IonRefresher, done?: () => void, showErrors: boolean = false): Promise<void> {
        if (this.loaded) {
            return this.refreshContent(showErrors).finally(() => {
                refresher?.complete();
                done && done();
            });
        }
    }

    /**
     * Perform the refresh content function.
     *
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Resolved when done.
     */
    protected async refreshContent(showErrors: boolean = false): Promise<void> {
        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        try {
            await this.invalidateContent();
        } catch (ex) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(ex);
        }

        await this.loadContent(true, showErrors);
    }

    /**
     * Perform the invalidate content function.
     *
     * @return Resolved when done.
     */
    protected async invalidateContent(): Promise<void> {
        return;
    }

    /**
     * Loads the component contents and shows the corresponding error.
     *
     * @param refresh Whether we're refreshing data.
     * @param showErrors Wether to show errors to the user or hide them.
     * @return Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async loadContent(refresh?: boolean, showErrors: boolean = false): Promise<void> {
        // Wrap the call in a try/catch so the workflow isn't interrupted if an error occurs.
        try {
            await this.fetchContent(refresh);
        } catch (error) {
            // An error ocurred in the function, log the error and just resolve the promise so the workflow continues.
            this.logger.error(error);

            // Error getting data, fail.
            CoreDomUtils.showErrorModalDefault(error, this.fetchContentDefaultError, true);
        }

        this.loaded = true;
    }

    /**
     * Download the component contents.
     *
     * @param refresh Whether we're refreshing data.
     * @return Promise resolved when done.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected async fetchContent(refresh: boolean = false): Promise<void> {
        return;
    }

}
