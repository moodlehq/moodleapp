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

import { Component, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { IonRefresher } from '@ionic/angular';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreEvents } from '@singletons/events';
import { CoreUser, CoreUserProfile, CoreUserProvider } from '@features/user/services/user';
import { CoreUserHelper } from '@features/user/services/user-helper';
import { CoreNavigator } from '@services/navigator';

/**
 * Page that displays info about a user.
 */
@Component({
    selector: 'page-core-user-about',
    templateUrl: 'about.html',
})
export class CoreUserAboutPage implements OnInit {

    protected userId!: number;
    protected siteId: string;

    courseId!: number;
    userLoaded = false;
    hasContact = false;
    hasDetails = false;
    user?: CoreUserProfile;
    title?: string;
    formattedAddress?: string;
    encodedAddress?: SafeUrl;

    constructor() {
        this.siteId = CoreSites.getCurrentSiteId();
    }

    /**
     * On init.
     *
     * @return Promise resolved when done.
     */
    async ngOnInit(): Promise<void> {
        this.userId = CoreNavigator.getRouteNumberParam('userId') || 0;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId') || 0;

        this.fetchUser().finally(() => {
            this.userLoaded = true;
        });
    }

    /**
     * Fetches the user data.
     *
     * @return Promise resolved when done.
     */
    async fetchUser(): Promise<void> {
        try {
            const user = await CoreUser.getProfile(this.userId, this.courseId);

            if (user.address) {
                this.formattedAddress = CoreUserHelper.formatAddress(user.address, user.city, user.country);
                this.encodedAddress = CoreTextUtils.buildAddressURL(this.formattedAddress);
            }

            this.hasContact = !!(user.email || user.phone1 || user.phone2 || user.city || user.country || user.address);
            this.hasDetails = !!(user.url || user.interests || (user.customfields && user.customfields.length > 0));

            this.user = user;
            this.title = user.fullname;
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.user.errorloaduser', true);
        }
    }

    /**
     * Refresh the user data.
     *
     * @param event Event.
     * @return Promise resolved when done.
     */
    async refreshUser(event?: IonRefresher): Promise<void> {
        await CoreUtils.ignoreErrors(CoreUser.invalidateUserCache(this.userId));

        await this.fetchUser();

        event?.complete();

        if (this.user) {
            CoreEvents.trigger(CoreUserProvider.PROFILE_REFRESHED, {
                courseId: this.courseId,
                userId: this.userId,
                user: this.user,
            }, this.siteId);
        }
    }

}
