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

import { Component } from '@angular/core';
import { IonicPage, NavParams } from 'ionic-angular';
import { CoreUserProvider } from '../../providers/user';
import { CoreUserHelperProvider } from '../../providers/helper';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Page that displays an user about page.
 */
@IonicPage({ segment: 'core-user-about' })
@Component({
    selector: 'page-core-user-about',
    templateUrl: 'about.html',
})
export class CoreUserAboutPage {
    protected courseId: number;
    protected userId: number;
    protected siteId;

    userLoaded = false;
    hasContact = false;
    hasDetails = false;
    user: any = {};
    title: string;

    constructor(navParams: NavParams, private userProvider: CoreUserProvider, private userHelper: CoreUserHelperProvider,
            private domUtils: CoreDomUtilsProvider, private eventsProvider: CoreEventsProvider,
            private sitesProvider: CoreSitesProvider, private textUtils: CoreTextUtilsProvider) {

        this.userId = navParams.get('userId');
        this.courseId = navParams.get('courseId');

        this.siteId = this.sitesProvider.getCurrentSite().getId();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchUser().finally(() => {
            this.userLoaded = true;
        });
    }

    /**
     * Fetches the user and updates the view.
     */
    fetchUser(): Promise<any> {
        return this.userProvider.getProfile(this.userId, this.courseId).then((user) => {

            if (user.address) {
                user.address = this.userHelper.formatAddress(user.address, user.city, user.country);
                user.encodedAddress = this.textUtils.buildAddressURL(user.address);
            }

            this.hasContact = user.email || user.phone1 || user.phone2 || user.city || user.country || user.address;
            this.hasDetails = user.url || user.interests || (user.customfields && user.customfields.length > 0);

            this.user = user;
            this.title = user.fullname;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.user.errorloaduser', true);
        });
    }

    /**
     * Refresh the user.
     *
     * @param {any} refresher Refresher.
     */
    refreshUser(refresher?: any): void {
        this.userProvider.invalidateUserCache(this.userId).finally(() => {
            this.fetchUser().finally(() => {
                this.eventsProvider.trigger(CoreUserProvider.PROFILE_REFRESHED, {
                    courseId: this.courseId, userId: this.userId,
                    user: this.user
                }, this.siteId);
                refresher && refresher.complete();
            });
        });
    }
}
