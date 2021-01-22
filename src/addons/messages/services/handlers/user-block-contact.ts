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

import { Injectable, OnDestroy } from '@angular/core';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreUserDelegateService, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@features/user/services/user-delegate';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { makeSingleton, Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { AddonMessages } from '../messages';

/**
 * Profile block/unblock contact handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesBlockContactUserHandlerService implements CoreUserProfileHandler, OnDestroy {

    /**
     * Update handler information event.
     */
    static readonly UPDATED_EVENT = 'AddonMessagesBlockContactUserHandler_updated_event';

    name = 'AddonMessages:blockContact';
    priority = 600;
    type = CoreUserDelegateService.TYPE_ACTION;

    protected disabled = false;
    protected updateObserver: CoreEventObserver;

    constructor() {

        this.updateObserver = CoreEvents.on<{ userId: number }>(
            AddonMessagesBlockContactUserHandlerService.UPDATED_EVENT,
            (data) => {
                this.checkButton(data.userId);
            },
        );
    }

    /**
     * Check if handler is enabled.
     *
     * @return Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    async isEnabled(): Promise<boolean> {
        return AddonMessages.instance.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    async isEnabledForUser(user: CoreUserProfile): Promise<boolean> {
        return user.id != CoreSites.instance.getCurrentSiteUserId();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param user User object.
     * @return Data needed to render the handler.
     */
    getDisplayData(user: CoreUserProfile): CoreUserProfileHandlerData {
        this.checkButton(user.id);

        return {
            icon: '',
            title: '',
            spinner: false,
            class: '',
            action: async (event: Event, user: CoreUserProfile): Promise<void> => {
                event.preventDefault();
                event.stopPropagation();

                if (this.disabled) {
                    return;
                }
                this.disabled = true;
                this.updateButton(user.id, { spinner: true });

                try {
                    const isBlocked = await AddonMessages.instance.isBlocked(user.id);
                    if (isBlocked) {
                        const template = Translate.instance.instant('addon.messages.unblockuserconfirm', { $a: user.fullname });
                        const okText = Translate.instance.instant('addon.messages.unblockuser');
                        let confirm = false;

                        try {
                            await CoreDomUtils.instance.showConfirm(template, undefined, okText);
                            confirm = true;
                        } catch {
                            // Do nothing.
                            confirm = false;
                        }

                        if (confirm) {
                            await AddonMessages.instance.unblockContact(user.id);
                        }
                    } else {
                        const template = Translate.instance.instant('addon.messages.blockuserconfirm', { $a: user.fullname });
                        const okText = Translate.instance.instant('addon.messages.blockuser');
                        let confirm = false;

                        try {
                            await CoreDomUtils.instance.showConfirm(template, undefined, okText);
                            confirm = true;
                        } catch {
                            // Do nothing.
                            confirm = false;
                        }

                        if (confirm) {
                            await AddonMessages.instance.blockContact(user.id);
                        }
                    }
                } catch (error) {
                    CoreDomUtils.instance.showErrorModalDefault(error, 'core.error', true);
                } finally {
                    CoreEvents.trigger(AddonMessagesBlockContactUserHandlerService.UPDATED_EVENT, { userId: user.id });

                    this.checkButton(user.id).finally(() => {
                        this.disabled = false;
                    });
                }
            },
        };
    }

    /**
     * Update Button with avalaible data.
     *
     * @param userId User Id to update.
     * @return Promise resolved when done.
     */
    protected async checkButton(userId: number): Promise<void> {
        this.updateButton(userId, { spinner: true });

        try {
            const isBlocked = await AddonMessages.instance.isBlocked(userId);
            if (isBlocked) {
                this.updateButton(userId, {
                    title: 'addon.messages.unblockuser',
                    class: 'addon-messages-unblockcontact-handler',
                    icon: 'fas-user-check',
                    hidden: false,
                    spinner: false,
                });
            } else {
                this.updateButton(userId, {
                    title: 'addon.messages.blockuser',
                    class: 'addon-messages-blockcontact-handler',
                    icon: 'fas-user-lock',
                    hidden: false,
                    spinner: false,
                });
            }
        } catch {
            // This fails for some reason, let's just hide the button.
            this.updateButton(userId, { hidden: true });
        }
    }

    /**
     * Triggers the event to update the handler information.
     *
     * @param userId The user ID the handler belongs to.
     * @param data Data that should be updated.
     */
    protected updateButton(userId: number, data: Record<string, unknown>): void {
        // This fails for some reason, let's just hide the button.
        CoreEvents.trigger(CoreUserDelegateService.UPDATE_HANDLER_EVENT, { handler: this.name, data: data, userId: userId });
    }

    /**
     * Destroyed method.
     */
    ngOnDestroy(): void {
        this.updateObserver?.off();
    }

}

export class AddonMessagesBlockContactUserHandler extends makeSingleton(AddonMessagesBlockContactUserHandlerService) {}
