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

import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChange } from '@angular/core';

import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { USER_PROFILE_PICTURE_UPDATED, CoreUserBasicData } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CoreUserHelper } from '@features/user/services/user-helper';
import { CoreUrl } from '@singletons/url';
import { CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { toBoolean } from '@/core/transforms/boolean';

/**
 * Component to display a "user avatar".
 *
 * Example: <core-user-avatar [user]="participant"></core-user-avatar>
 */
@Component({
    selector: 'core-user-avatar',
    templateUrl: 'core-user-avatar.html',
    styleUrls: ['user-avatar.scss'],
})
export class CoreUserAvatarComponent implements OnInit, OnChanges, OnDestroy {

    @Input() user?: CoreUserWithAvatar; // @todo Fix the accepted type and restrict it a bit.
    @Input() site?: CoreSiteBasicInfo | CoreSiteInfo; // Site info contains user info.
    // The following params will override the ones in user object.
    @Input() profileUrl?: string;
    @Input({ transform: toBoolean }) linkProfile = true; // Avoid linking to the profile if wanted.
    @Input() fullname?: string;
    @Input() userId?: number; // If provided or found it will be used to link the image to the profile.
    @Input() courseId?: number;
    @Input({ transform: toBoolean }) checkOnline = false; // If want to check and show online status.
    @Input() siteId?: string;

    avatarUrl?: string;
    initials = '';

    // Variable to check if we consider this user online or not.
    // @todo Use setting when available (see MDL-63972) so we can use site setting.
    protected timetoshowusers = 300000; // Miliseconds default.
    protected currentUserId: number;
    protected pictureObserver: CoreEventObserver;

    constructor() {
        this.currentUserId = CoreSites.getCurrentSiteUserId();

        this.pictureObserver = CoreEvents.on(
            USER_PROFILE_PICTURE_UPDATED,
            (data) => {
                if (data.userId === this.userId) {
                    this.avatarUrl = data.picture;
                }
            },
            CoreSites.getCurrentSiteId(),
        );
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.siteId = this.siteId ?? (this.site && 'id' in this.site
            ? this.site.id
            : CoreSites.getCurrentSiteId());

        if (this.site && !this.user) {
            this.user = {
                id: ('userid' in this.site
                    ? this.site.userid
                    : this.site.userId)
                    ?? (await CoreSites.getSite(this.siteId)).getUserId(),
                fullname: this.site.fullname ?? '',
                firstname: this.site.firstname ?? '',
                lastname: this.site.lastname ?? '',
                userpictureurl: this.site.userpictureurl,
            };
        }

        this.setFields();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        // If something change, update the fields.
        if (changes) {
            this.setFields();
        }
    }

    /**
     * Avatar image loading error handler.
     */
    loadImageError(): void {
        this.avatarUrl = undefined;
    }

    /**
     * Set fields from user.
     */
    protected async setFields(): Promise<void> {
        const profileUrl = this.profileUrl || (this.user && (this.user.profileimageurl || this.user.userprofileimageurl ||
            this.user.userpictureurl || this.user.profileimageurlsmall || (this.user.urls && this.user.urls.profileimage)));

        if (typeof profileUrl === 'string') {
            this.avatarUrl = profileUrl;
        }

        this.fullname = this.fullname || (this.user && (this.user.fullname || this.user.userfullname));

        if (this.avatarUrl && CoreUrl.isThemeImageUrl(this.avatarUrl)) {
            this.avatarUrl = undefined;
        }

        this.userId = this.userId || (this.user && (this.user.userid || this.user.id));
        this.courseId = this.courseId || (this.user && this.user.courseid);

        this.initials =
            await CoreUserHelper.getUserInitialsFromParts({
                firstname: this.user?.firstname,
                lastname: this.user?.lastname,
                fullname: this.fullname,
                userId: this.userId,
        });
    }

    /**
     * Helper function for checking the time meets the 'online' condition.
     *
     * @returns boolean
     */
    isOnline(): boolean {
        if (!this.user) {
            return false;
        }

        if (CoreUtils.isFalseOrZero(this.user.isonline)) {
            return false;
        }

        if (this.user.lastaccess) {
            // If the time has passed, don't show the online status.
            const time = Date.now() - this.timetoshowusers;

            return this.user.lastaccess * 1000 >= time;
        } else {
            // You have to have Internet access first.
            return !!this.user.isonline && CoreNetwork.isOnline();
        }
    }

    /**
     * Go to user profile.
     *
     * @param event Click event.
     */
    gotoProfile(event: Event): void {
        if (!this.linkProfile || !this.userId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        CoreNavigator.navigateToSitePath('user', {
            params: {
                userId: this.userId,
                courseId: this.courseId,
            },
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.pictureObserver.off();
    }

}

/**
 * Type with all possible formats of user.
 */
export type CoreUserWithAvatar = CoreUserBasicData & {
    userpictureurl?: string;
    userprofileimageurl?: string;
    profileimageurlsmall?: string;
    urls?: {
        profileimage?: string;
    };
    userfullname?: string;
    userid?: number;
    isonline?: boolean;
    courseid?: number;
    lastaccess?: number;
    firstname?: string; // The first name(s) of the user.
    lastname?: string; // The family name of the user.
};
