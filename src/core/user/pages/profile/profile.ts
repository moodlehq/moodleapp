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
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { TranslateService } from '@ngx-translate/core';
import { CoreCoursesProvider } from '../../../courses/providers/courses';
import { CoreEventsProvider } from '../../../../providers/events';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreMimetypeUtilsProvider } from '../../../../providers/utils/mimetype';
import { CoreFileUploaderHelperProvider } from '../../../fileuploader/providers/helper';
import { CoreUserDelegate } from '../../providers/user-delegate';

/**
 * Page that displays an user profile page.
 */
@IonicPage({segment: "core-user-profile"})
@Component({
    selector: 'page-core-user-profile',
    templateUrl: 'profile.html',
})
export class CoreUserProfilePage {
    protected courseId: number;
    protected userId: number;
    protected site;
    protected obsProfileRefreshed: any;

    userLoaded: boolean = false;
    isLoadingHandlers: boolean = false;
    user: any = {};
    title: string;
    isDeleted: boolean = false;
    canChangeProfilePicture: boolean = false;
    actionHandlers = [];
    newPageHandlers = [];
    communicationHandlers = [];

    constructor(navParams: NavParams, private userProvider: CoreUserProvider, private userHelper: CoreUserHelperProvider,
            private domUtils: CoreDomUtilsProvider, private translate: TranslateService, private eventsProvider: CoreEventsProvider,
            private coursesProvider: CoreCoursesProvider, private sitesProvider: CoreSitesProvider,
            private mimetypeUtils: CoreMimetypeUtilsProvider, private fileUploaderHelper: CoreFileUploaderHelperProvider,
            private userDelegate: CoreUserDelegate) {
        this.userId = navParams.get('userId');
        this.courseId = navParams.get('courseId');

        this.site = this.sitesProvider.getCurrentSite();

        // Allow to change the profile image only in the app profile page.
        this.canChangeProfilePicture =
            (!this.courseId || this.courseId == this.site.getSiteHomeId()) &&
            this.userId == this.site.getUserId() &&
            this.site.canUploadFiles() &&
            this.site.wsAvailable('core_user_update_picture') &&
            !this.userProvider.isUpdatePictureDisabledInSite(this.site);

        this.obsProfileRefreshed = eventsProvider.on(CoreUserProvider.PROFILE_REFRESHED, (data) => {
            if (typeof data.user != "undefined") {
                this.user.email = data.user.email;
                this.user.address = this.userHelper.formatAddress("", data.user.city, data.user.country);
            }
        }, sitesProvider.getCurrentSiteId());
    }

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        this.fetchUser().then(() => {
            return this.userProvider.logView(this.userId, this.courseId).catch((error) => {
                this.isDeleted = error.errorcode === 'userdeleted';
            });
        }).finally(() => {
            this.userLoaded = true;
        });
    }

    /**
     * Fetches the user and updates the view.
     */
    fetchUser() : Promise<any> {
        return this.userProvider.getProfile(this.userId, this.courseId).then((user) =>  {

            user.address = this.userHelper.formatAddress("", user.city, user.country);
            user.roles = this.userHelper.formatRoleList(user.roles);

            this.user = user;
            this.title = user.fullname;

            this.isLoadingHandlers = true;

            this.userDelegate.getProfileHandlersFor(user, this.courseId).then((handlers) => {
                this.actionHandlers = [];
                this.newPageHandlers = [];
                this.communicationHandlers = [];
                handlers.forEach((handler) => {
                    switch (handler.type) {
                        case CoreUserDelegate.TYPE_COMMUNICATION:
                            this.communicationHandlers.push(handler.data);
                            break;
                        case CoreUserDelegate.TYPE_ACTION:
                            this.actionHandlers.push(handler.data);
                            break;
                        case CoreUserDelegate.TYPE_NEW_PAGE:
                        default:
                            this.newPageHandlers.push(handler.data);
                            break;
                    }
                });
            }).finally(() => {
                this.isLoadingHandlers = false;
            });

        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'core.user.errorloaduser', true);
        });
    }


    /**
     * Opens dialog to change profile picture.
     */
    changeProfilePicture(){
        let maxSize = -1,
            title = this.translate.instant('core.user.newpicture'),
            mimetypes = this.mimetypeUtils.getGroupMimeInfo('image', 'mimetypes');

        return this.fileUploaderHelper.selectAndUploadFile(maxSize, title, mimetypes).then((result) => {
            let modal = this.domUtils.showModalLoading('core.sending', true);

            return this.userProvider.changeProfilePicture(result.itemid, this.userId).then((profileImageURL) => {
                this.eventsProvider.trigger(CoreUserProvider.PROFILE_PICTURE_UPDATED, {userId: this.userId,
                    picture: profileImageURL});
                this.sitesProvider.updateSiteInfo(this.site.getId());
                this.refreshUser();
            }).finally(() => {
                modal.dismiss();
            });
        }).catch((message) => {
            if (message) {
                this.domUtils.showErrorModal(message);
            }
        });
    }

    /**
     * Refresh the user.
     *
     * @param {any} refresher Refresher.
     */
    refreshUser(refresher?: any) {
        let promises = [];

        promises.push(this.userProvider.invalidateUserCache(this.userId));
        promises.push(this.coursesProvider.invalidateUserNavigationOptions());
        promises.push(this.coursesProvider.invalidateUserAdministrationOptions());

        Promise.all(promises).finally(() => {
            this.fetchUser().finally(() => {
                this.eventsProvider.trigger(CoreUserProvider.PROFILE_REFRESHED, {courseId: this.courseId, userId: this.userId,
                    user: this.user}, this.site.getId());
                refresher && refresher.complete();
            });
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy() {
        this.obsProfileRefreshed && this.obsProfileRefreshed.off();
    }
}