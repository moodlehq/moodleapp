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

import { Component, OnDestroy, OnInit } from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    CoreUser,
    CoreUserProfile,
    USER_PROFILE_PICTURE_UPDATED,
    USER_PROFILE_REFRESHED,
    USER_PROFILE_SERVER_TIMEZONE,
} from '@features/user/services/user';
import { CoreUserHelper } from '@features/user/services/user-helper';
import { CoreNavigator } from '@services/navigator';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreSite } from '@classes/sites/site';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { Translate } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreLoadings } from '@services/loadings';

/**
 * Page that displays info about a user.
 */
@Component({
    selector: 'page-core-user-about',
    templateUrl: 'about.html',
    styleUrls: ['about.scss'],
})
export class CoreUserAboutPage implements OnInit, OnDestroy {

    courseId!: number;
    userLoaded = false;
    hasContact = false;
    hasDetails = false;
    user?: CoreUserProfile;
    title?: string;
    canChangeProfilePicture = false;
    interests?: string[];
    displayTimezone = false;
    canShowDepartment = false;

    protected userId!: number;
    protected site!: CoreSite;
    protected obsProfileRefreshed?: CoreEventObserver;

    constructor() {
        try {
            this.site = CoreSites.getRequiredCurrentSite();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            CoreNavigator.back();

            return;
        }

        this.obsProfileRefreshed = CoreEvents.on(USER_PROFILE_REFRESHED, (data) => {
            if (!this.user || !data.user) {
                return;
            }

            this.user.email = data.user.email;
        }, CoreSites.getCurrentSiteId());
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.userId = CoreNavigator.getRouteNumberParam('userId') || 0;
        this.courseId = CoreNavigator.getRouteNumberParam('courseId') || 0;
        this.canShowDepartment = this.userId != this.site.getUserId();

        // Allow to change the profile image only in the app profile page.
        this.canChangeProfilePicture =
            !this.courseId &&
            this.userId == this.site.getUserId() &&
            this.site.canUploadFiles() &&
            !CoreUser.isUpdatePictureDisabledInSite(this.site);

        this.fetchUser().finally(() => {
            this.userLoaded = true;
        });
    }

    /**
     * Fetches the user data.
     *
     * @returns Promise resolved when done.
     */
    async fetchUser(): Promise<void> {
        try {
            const user = await CoreUser.getProfile(this.userId, this.courseId);

            this.interests = user.interests ?
                user.interests.split(',').map(interest => interest.trim()) :
                undefined;

            this.hasContact = !!(user.email || user.phone1 || user.phone2 || user.city || user.country || user.address);
            this.hasDetails = !!(user.url || user.interests || (user.customfields && user.customfields.length > 0));

            this.user = user;
            this.title = user.fullname;

            this.fillTimezone();

            await this.checkUserImageUpdated();
        } catch (error) {
            CoreDomUtils.showErrorModalDefault(error, 'core.user.errorloaduser', true);
        }
    }

    /**
     * Check if current user image has changed.
     *
     * @returns Promise resolved when done.
     */
    protected async checkUserImageUpdated(): Promise<void> {
        if (!this.site || !this.site.getInfo() || !this.user) {
            return;
        }

        if (this.userId != this.site.getUserId() || !this.isUserAvatarDirty()) {
            // Not current user or hasn't changed.
            return;
        }

        // The current user image received is different than the one stored in site info. Assume the image was updated.
        // Update the site info to get the right avatar in there.
        try {
            await CoreSites.updateSiteInfo(this.site.getId());
        } catch {
            // Cannot update site info. Assume the profile image is the right one.
            CoreEvents.trigger(USER_PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: this.user.profileimageurl,
            }, this.site.getId());
        }

        if (this.isUserAvatarDirty()) {
            // The image is still different, this means that the good one is the one in site info.
            await this.refreshUser();
        } else {
            // Now they're the same, send event to use the right avatar in the rest of the app.
            CoreEvents.trigger(USER_PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: this.user.profileimageurl,
            }, this.site.getId());
        }
    }

    /**
     * Opens dialog to change profile picture.
     */
    async changeProfilePicture(): Promise<void> {
        const maxSize = -1;
        const title = Translate.instant('core.user.newpicture');
        const mimetypes = CoreMimetypeUtils.getGroupMimeInfo('image', 'mimetypes');
        let modal: CoreIonLoadingElement | undefined;

        try {
            const result = await CoreFileUploaderHelper.selectAndUploadFile(maxSize, title, mimetypes);

            modal = await CoreLoadings.show('core.sending', true);

            const profileImageURL = await CoreUser.changeProfilePicture(result.itemid, this.userId, this.site.getId());

            CoreEvents.trigger(USER_PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: profileImageURL,
            }, this.site.getId());

            CoreSites.updateSiteInfo(this.site.getId());

            this.refreshUser();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Refresh the user data.
     *
     * @param event Event.
     * @returns Promise resolved when done.
     */
    async refreshUser(event?: HTMLIonRefresherElement): Promise<void> {
        await CoreUtils.ignoreErrors(CoreUser.invalidateUserCache(this.userId));

        await this.fetchUser();

        event?.complete();

        if (this.user) {
            CoreEvents.trigger(USER_PROFILE_REFRESHED, {
                courseId: this.courseId,
                userId: this.userId,
                user: this.user,
            }, this.site.getId());
        }
    }

    /**
     * Check whether the user avatar is not up to date with site info.
     *
     * @returns Whether the user avatar differs from site info cache.
     */
    protected isUserAvatarDirty(): boolean {
        if (!this.user || !this.site) {
            return false;
        }

        const courseAvatarUrl = this.normalizeAvatarUrl(this.user.profileimageurl);
        const siteAvatarUrl = this.normalizeAvatarUrl(this.site.getInfo()?.userpictureurl);

        return courseAvatarUrl !== siteAvatarUrl;
    }

    /**
     * Normalize an avatar url regardless of theme.
     *
     * Given that the default image is the only one that can be changed per theme, any other url will stay the same. Note that
     * the values returned by this function may not be valid urls, given that they are intended for string comparison.
     *
     * @param avatarUrl Avatar url.
     * @returns Normalized avatar string (may not be a valid url).
     */
    protected normalizeAvatarUrl(avatarUrl?: string): string {
        if (!avatarUrl) {
            return 'undefined';
        }

        if (CoreUrl.isThemeImageUrl(avatarUrl, this.site?.siteUrl)) {
            return 'default';
        }

        return avatarUrl;
    }

    /**
     * Fill user timezone depending on the server and fix the legacy timezones.
     */
    protected fillTimezone(): void {
        if (!this.user) {
            return;
        }

        const serverTimezone = CoreSites.getRequiredCurrentSite().getStoredConfig('timezone');
        this.displayTimezone = !!serverTimezone;

        if (!this.displayTimezone) {
            return;
        }

        if (this.user.timezone === USER_PROFILE_SERVER_TIMEZONE) {
            this.user.timezone = serverTimezone;
        }

        if (this.user.timezone) {
            this.user.timezone = CoreUserHelper.translateLegacyTimezone(this.user.timezone);
        }
    }

    /**
     * Open a user interest.
     *
     * @param interest Interest name.
     */
    openInterest(interest: string): void {
        CoreNavigator.navigateToSitePath('/tag/index', { params: {
            tagName: interest,
        } });
    }

    /**
     * Get the Sequence value from custom fields or other sources.
     * 
     * @returns The sequence value or null.
     */
    getSequenceValue(): string | null {
        // First try to get from custom fields if they exist
        if (this.user?.customfields) {
            const sequenceField = this.user.customfields.find(field => 
                field.shortname === 'ID' || 
                field.shortname === 'id' || 
                field.shortname === 'sequence' ||
                field.shortname === 'Sequence'
            );
            if (sequenceField) {
                return sequenceField.displayvalue || sequenceField.value || null;
            }
        }
        
        // Check if it might be in preferences
        if (this.user?.preferences) {
            const sequencePref = this.user.preferences.find(pref => 
                pref.name === 'profile_field_ID' || 
                pref.name === 'profile_field_sequence' ||
                pref.name === 'profile_field_Sequence'
            );
            if (sequencePref) {
                return sequencePref.value || null;
            }
        }
        
        // TODO: Remove this comment once API returns custom fields
        // For testing purposes, you can uncomment the line below and set a test value
        // return "TEST-SEQ-001";
        
        return null;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.obsProfileRefreshed?.off();
    }

}
