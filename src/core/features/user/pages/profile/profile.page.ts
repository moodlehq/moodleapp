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
import { ActivatedRoute } from '@angular/router';
import { IonRefresher } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { CoreSite } from '@classes/site';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreMimetypeUtils } from '@services/utils/mimetype';
import { Translate } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import {
    CoreUser,
    CoreUserProfile,
    CoreUserProfilePictureUpdatedData,
    CoreUserProfileRefreshedData,
    CoreUserProvider,
} from '@features/user/services/user';
import { CoreUserHelper } from '@features/user/services/user-helper';
import { CoreUserDelegate, CoreUserDelegateService, CoreUserProfileHandlerData } from '@features/user/services/user-delegate';
import { CoreFileUploaderHelper } from '@features/fileuploader/services/fileuploader-helper';
import { CoreIonLoadingElement } from '@classes/ion-loading';
import { CoreUtils } from '@services/utils/utils';
import { CoreNavigator } from '@services/navigator';

@Component({
    selector: 'page-core-user-profile',
    templateUrl: 'profile.html',
    styleUrls: ['profile.scss'],
})
export class CoreUserProfilePage implements OnInit, OnDestroy {

    protected courseId!: number;
    protected userId!: number;
    protected site?: CoreSite;
    protected obsProfileRefreshed: CoreEventObserver;
    protected subscription?: Subscription;

    userLoaded = false;
    isLoadingHandlers = false;
    user?: CoreUserProfile;
    title?: string;
    isDeleted = false;
    isEnrolled = true;
    canChangeProfilePicture = false;
    rolesFormatted?: string;
    actionHandlers: CoreUserProfileHandlerData[] = [];
    newPageHandlers: CoreUserProfileHandlerData[] = [];
    communicationHandlers: CoreUserProfileHandlerData[] = [];

    constructor(
        protected route: ActivatedRoute,
    ) {

        this.obsProfileRefreshed = CoreEvents.on<CoreUserProfileRefreshedData>(CoreUserProvider.PROFILE_REFRESHED, (data) => {
            if (!this.user || !data.user) {
                return;
            }

            this.user.email = data.user.email;
            this.user.address = CoreUserHelper.instance.formatAddress('', data.user.city, data.user.country);
        }, CoreSites.instance.getCurrentSiteId());
    }

    /**
     * On init.
     */
    async ngOnInit(): Promise<void> {
        this.site = CoreSites.instance.getCurrentSite();
        this.userId = parseInt(this.route.snapshot.queryParams['userId'], 10);
        this.courseId = parseInt(this.route.snapshot.queryParams['courseId'], 10);

        if (!this.site) {
            return;
        }

        // Allow to change the profile image only in the app profile page.
        this.canChangeProfilePicture =
            (!this.courseId || this.courseId == this.site.getSiteHomeId()) &&
            this.userId == this.site.getUserId() &&
            this.site.canUploadFiles() &&
            CoreUser.instance.canUpdatePictureInSite(this.site) &&
            !CoreUser.instance.isUpdatePictureDisabledInSite(this.site);

        try {
            await this.fetchUser();

            try {
                await CoreUser.instance.logView(this.userId, this.courseId, this.user!.fullname);
            } catch (error) {
                this.isDeleted = error?.errorcode === 'userdeleted';
                this.isEnrolled = error?.errorcode !== 'notenrolledprofile';
            }
        } finally {
            this.userLoaded = true;
        }
    }

    /**
     * Fetches the user and updates the view.
     */
    async fetchUser(): Promise<void> {
        try {
            const user = await CoreUser.instance.getProfile(this.userId, this.courseId);

            user.address = CoreUserHelper.instance.formatAddress('', user.city, user.country);
            this.rolesFormatted = 'roles' in user ? CoreUserHelper.instance.formatRoleList(user.roles) : '';

            this.user = user;
            this.title = user.fullname;

            // If there's already a subscription, unsubscribe because we'll get a new one.
            this.subscription?.unsubscribe();

            this.subscription = CoreUserDelegate.instance.getProfileHandlersFor(user, this.courseId).subscribe((handlers) => {
                this.actionHandlers = [];
                this.newPageHandlers = [];
                this.communicationHandlers = [];
                handlers.forEach((handler) => {
                    switch (handler.type) {
                        case CoreUserDelegateService.TYPE_COMMUNICATION:
                            this.communicationHandlers.push(handler.data);
                            break;
                        case CoreUserDelegateService.TYPE_ACTION:
                            this.actionHandlers.push(handler.data);
                            break;
                        case CoreUserDelegateService.TYPE_NEW_PAGE:
                        default:
                            this.newPageHandlers.push(handler.data);
                            break;
                    }
                });

                this.isLoadingHandlers = !CoreUserDelegate.instance.areHandlersLoaded(user.id);
            });

            await this.checkUserImageUpdated();

        } catch (error) {
            // Error is null for deleted users, do not show the modal.
            CoreDomUtils.instance.showErrorModal(error);
        }
    }

    /**
     * Check if current user image has changed.
     *
     * @return Promise resolved when done.
     */
    protected async checkUserImageUpdated(): Promise<void> {
        if (!this.site || !this.site.getInfo() || !this.user) {
            return;
        }

        if (this.userId != this.site.getUserId() || this.user.profileimageurl == this.site.getInfo()!.userpictureurl) {
            // Not current user or hasn't changed.
            return;
        }

        // The current user image received is different than the one stored in site info. Assume the image was updated.
        // Update the site info to get the right avatar in there.
        try {
            await CoreSites.instance.updateSiteInfo(this.site.getId());
        } catch {
            // Cannot update site info. Assume the profile image is the right one.
            CoreEvents.trigger<CoreUserProfilePictureUpdatedData>(CoreUserProvider.PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: this.user.profileimageurl,
            }, this.site.getId());
        }

        if (this.user.profileimageurl != this.site.getInfo()!.userpictureurl) {
            // The image is still different, this means that the good one is the one in site info.
            await this.refreshUser();
        } else {
            // Now they're the same, send event to use the right avatar in the rest of the app.
            CoreEvents.trigger<CoreUserProfilePictureUpdatedData>(CoreUserProvider.PROFILE_PICTURE_UPDATED, {
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
        const title = Translate.instance.instant('core.user.newpicture');
        const mimetypes = CoreMimetypeUtils.instance.getGroupMimeInfo('image', 'mimetypes');
        let modal: CoreIonLoadingElement | undefined;

        try {
            const result = await CoreFileUploaderHelper.instance.selectAndUploadFile(maxSize, title, mimetypes);

            modal = await CoreDomUtils.instance.showModalLoading('core.sending', true);

            const profileImageURL = await CoreUser.instance.changeProfilePicture(result.itemid, this.userId, this.site!.getId());

            CoreEvents.trigger<CoreUserProfilePictureUpdatedData>(CoreUserProvider.PROFILE_PICTURE_UPDATED, {
                userId: this.userId,
                picture: profileImageURL,
            }, this.site!.getId());

            CoreSites.instance.updateSiteInfo(this.site!.getId());

            this.refreshUser();
        } catch (error) {
            CoreDomUtils.instance.showErrorModal(error);
        } finally {
            modal?.dismiss();
        }
    }

    /**
     * Refresh the user.
     *
     * @param event Event.
     * @return Promise resolved when done.
     */
    async refreshUser(event?: CustomEvent<IonRefresher>): Promise<void> {
        await CoreUtils.instance.ignoreErrors(Promise.all([
            CoreUser.instance.invalidateUserCache(this.userId),
            // @todo this.coursesProvider.invalidateUserNavigationOptions(),
            // this.coursesProvider.invalidateUserAdministrationOptions()
        ]));

        await this.fetchUser();

        event?.detail.complete();

        if (this.user) {
            CoreEvents.trigger<CoreUserProfileRefreshedData>(CoreUserProvider.PROFILE_REFRESHED, {
                courseId: this.courseId,
                userId: this.userId,
                user: this.user,
            }, this.site?.getId());
        }
    }

    /**
     * Open the page with the user details.
     */
    openUserDetails(): void {
        // @todo: Navigate out of split view if this page is in the right pane.
        CoreNavigator.instance.navigate('../about', {
            params: {
                courseId: this.courseId,
                userId: this.userId,
            },
        });
    }

    /**
     * A handler was clicked.
     *
     * @param event Click event.
     * @param handler Handler that was clicked.
     */
    handlerClicked(event: Event, handler: CoreUserProfileHandlerData): void {
        // @todo: Pass the right navCtrl if this page is in the right pane of split view.
        handler.action(event, this.user!, this.courseId);
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
        this.obsProfileRefreshed.off();
    }

}
