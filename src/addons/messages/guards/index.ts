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

import { Injectable } from '@angular/core';
import { CanActivate, UrlTree } from '@angular/router';
import { Router } from '@singletons';
import { AddonMessagesMainMenuHandlerService } from '../services/handlers/mainmenu';
import { AddonMessages } from '../services/messages';

/**
 * Guard to redirect to the right page based on the current Moodle site version.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesIndexGuard implements CanActivate {

    /**
     * @inheritdoc
     */
    canActivate(): UrlTree {
        return this.guard();
    }

    /**
     * Check if there is a pending redirect and trigger it.
     */
    private guard(): UrlTree {
        const enabled = AddonMessages.isGroupMessagingEnabled();
        const path = `/main/${AddonMessagesMainMenuHandlerService.PAGE_NAME}/` + ( enabled ? 'group-conversations' : 'index');

        return Router.parseUrl(path);
    }

}
