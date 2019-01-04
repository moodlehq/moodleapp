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

import { Component, ViewChild } from '@angular/core';
import { IonicPage, Content, NavParams } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreCommentsProvider } from '../../providers/comments';

/**
 * Page that displays comments.
 */
@IonicPage({ segment: 'core-comments-viewer' })
@Component({
    selector: 'page-core-comments-viewer',
    templateUrl: 'viewer.html',
})
export class CoreCommentsViewerPage {
    @ViewChild(Content) content: Content;

    comments = [];
    commentsLoaded = false;
    contextLevel: string;
    instanceId: number;
    component: string;
    itemId: number;
    area: string;
    page: number;
    title: string;

    constructor(navParams: NavParams, sitesProvider: CoreSitesProvider, private userProvider: CoreUserProvider,
             private domUtils: CoreDomUtilsProvider, private translate: TranslateService,
             private commentsProvider: CoreCommentsProvider) {

        this.contextLevel = navParams.get('contextLevel');
        this.instanceId = navParams.get('instanceId');
        this.component = navParams.get('component');
        this.itemId = navParams.get('itemId');
        this.area = navParams.get('area') || '';
        this.page = navParams.get('page') || 0;
        this.title = navParams.get('title') || this.translate.instant('core.comments');
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        this.fetchComments().finally(() => {
            this.commentsLoaded = true;
        });
    }

    /**
     * Fetches the comments.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchComments(): Promise<any> {
        // Get comments data.
        return this.commentsProvider.getComments(this.contextLevel, this.instanceId, this.component, this.itemId,
                this.area, this.page).then((comments) => {
            this.comments = comments;
            this.comments.sort((a, b) => b.timecreated - a.timecreated);
            this.comments.forEach((comment) => {
                // Get the user profile image.
                this.userProvider.getProfile(comment.userid, undefined, true).then((user) => {
                    comment.profileimageurl = user.profileimageurl;
                }).catch(() => {
                    // Ignore errors.
                });
            });
        }).catch((error) => {
            if (error && this.component == 'assignsubmission_comments') {
                this.domUtils.showAlertTranslated('core.notice', 'core.commentsnotworking');
            } else {
                this.domUtils.showErrorModalDefault(error, this.translate.instant('core.error') + ': get_comments');
            }
        });
    }

    /**
     * Refresh the comments.
     *
     * @param {any} refresher Refresher.
     */
    refreshComments(refresher: any): void {
        this.commentsProvider.invalidateCommentsData(this.contextLevel, this.instanceId, this.component,
                this.itemId, this.area, this.page).finally(() => {
            return this.fetchComments().finally(() => {
                refresher.complete();
            });
        });
    }
}
