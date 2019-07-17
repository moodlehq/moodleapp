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

import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChange, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';
import { CoreAppProvider } from '@providers/app';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreEventsProvider } from '@providers/events';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Component to display a "user avatar".
 *
 * Example: <ion-avatar core-user-avatar [user]="participant"></ion-avatar>
 */
@Component({
    selector: 'ion-avatar[core-user-avatar]',
    templateUrl: 'core-user-avatar.html'
})
export class CoreUserAvatarComponent implements OnInit, OnChanges, OnDestroy {
    @Input() user: any;
    // The following params will override the ones in user object.
    @Input() profileUrl?: string;
    @Input() protected linkProfile = true; // Avoid linking to the profile if wanted.
    @Input() fullname?: string;
    @Input() protected userId?: number; // If provided or found it will be used to link the image to the profile.
    @Input() protected courseId?: number;
    @Input() checkOnline = false; // If want to check and show online status.
    @Input() extraIcon?: string; // Extra icon to show near the avatar.

    avatarUrl?: string;

    // Variable to check if we consider this user online or not.
    // @TODO: Use setting when available (see MDL-63972) so we can use site setting.
    protected timetoshowusers = 300000; // Miliseconds default.
    protected currentUserId: number;
    protected pictureObs;

    constructor(private navCtrl: NavController,
            private sitesProvider: CoreSitesProvider,
            private utils: CoreUtilsProvider,
            private appProvider: CoreAppProvider,
            eventsProvider: CoreEventsProvider,
            @Optional() private svComponent: CoreSplitViewComponent) {

        this.currentUserId = this.sitesProvider.getCurrentSiteUserId();

        this.pictureObs = eventsProvider.on(CoreUserProvider.PROFILE_PICTURE_UPDATED, (data) => {
            if (data.userId == this.userId) {
                this.avatarUrl = data.picture;
            }
        }, this.sitesProvider.getCurrentSiteId());
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.setFields();
    }

    /**
     * Listen to changes.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        // If something change, update the fields.
        if (changes) {
            this.setFields();
        }
    }

    /**
     * Set fields from user.
     */
    protected setFields(): void {
        const profileUrl = this.profileUrl || (this.user && (this.user.profileimageurl || this.user.userprofileimageurl ||
            this.user.userpictureurl || this.user.profileimageurlsmall));

        if (typeof profileUrl == 'string') {
            this.avatarUrl = profileUrl;
        }

        this.fullname = this.fullname || (this.user && (this.user.fullname || this.user.userfullname));

        this.userId = this.userId || (this.user && (this.user.userid || this.user.id));
        this.courseId = this.courseId || (this.user && this.user.courseid);
    }

    /**
     * Helper function for checking the time meets the 'online' condition.
     *
     * @return boolean
     */
    isOnline(): boolean {
        if (this.utils.isFalseOrZero(this.user.isonline)) {
            return false;
        }

        if (this.user.lastaccess) {
            // If the time has passed, don't show the online status.
            const time = new Date().getTime() - this.timetoshowusers;

            return this.user.lastaccess * 1000 >= time;
        } else {
            // You have to have Internet access first.
            return this.user.isonline && this.appProvider.isOnline();
        }
    }

    /**
     * Function executed image clicked.
     */
    gotoProfile(event: any): void {
        if (this.linkProfile && this.userId) {
            event.preventDefault();
            event.stopPropagation();

            // Decide which navCtrl to use. If this component is inside a split view, use the split view's master nav.
            const navCtrl = this.svComponent ? this.svComponent.getMasterNav() : this.navCtrl;
            navCtrl.push('CoreUserProfilePage', { userId: this.userId, courseId: this.courseId });
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.pictureObs && this.pictureObs.off();
    }
}
