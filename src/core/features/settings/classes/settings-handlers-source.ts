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

import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';
import {
    CoreSettingsDelegate,
    CoreSettingsHandlerToDisplay,
    CoreSettingsPageHandlerToDisplay,
} from '../services/settings-delegate';

/**
 * Provides a collection of site settings.
 */
export class CoreSettingsHandlersSource extends CoreRoutedItemsManagerSource<CoreSettingsPageHandlerToDisplay> {

    handlers: CoreSettingsHandlerToDisplay[] = [];

    /**
     * @inheritdoc
     */
    protected async loadPageItems(): Promise<{ items: CoreSettingsPageHandlerToDisplay[] }> {
        this.handlers = CoreSettingsDelegate.getHandlers();

        return {
            items: this.handlers.filter((handler): handler is CoreSettingsPageHandlerToDisplay => 'page' in handler),
        };
    }

    /**
     * @inheritdoc
     */
    getItemPath(handler: CoreSettingsPageHandlerToDisplay): string {
        return handler.page;
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(handler: CoreSettingsPageHandlerToDisplay): Params {
        return handler.params || {};
    }

}
