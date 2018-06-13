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

import { Component, ViewChild, Input, OnInit } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreUserProvider } from '../../providers/user';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreSplitViewComponent } from '@components/split-view/split-view';

/**
 * Component that displays the list of course participants.
 */
@Component({
    selector: 'core-user-participants',
    templateUrl: 'core-user-participants.html',
})
export class CoreUserParticipantsComponent implements OnInit {
    @ViewChild(Content) content: Content;
    @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;

    @Input() courseId: number;

    participantId: number;
    participants = [];
    canLoadMore = false;
    participantsLoaded = false;

    constructor(private userProvider: CoreUserProvider, private domUtils: CoreDomUtilsProvider) { }

    /**
     * View loaded.
     */
    ngOnInit(): void {
        // Get first participants.
        this.fetchData(true).then(() => {
            if (!this.participantId && this.splitviewCtrl.isOn() && this.participants.length > 0) {
                // Take first and load it.
                this.gotoParticipant(this.participants[0].id);
            }
            // Add log in Moodle.
            this.userProvider.logParticipantsView(this.courseId).catch(() => {
                // Ignore errors.
            });
        }).finally(() => {
            this.participantsLoaded = true;
        });
    }

    /**
     * Fetch all the data required for the view.
     *
     * @param {boolean} [refresh] Empty events array first.
     * @return {Promise<any>}     Resolved when done.
     */
    fetchData(refresh: boolean = false): Promise<any> {
        const firstToGet = refresh ? 0 : this.participants.length;

        return this.userProvider.getParticipants(this.courseId, firstToGet).then((data) => {
            if (refresh) {
                this.participants = data.participants;
            } else {
                this.participants = this.participants.concat(data.participants);
            }
            this.canLoadMore = data.canLoadMore;
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading participants');
            this.canLoadMore = false; // Set to false to prevent infinite calls with infinite-loading.
        });
    }

    /**
     * Refresh data.
     *
     * @param {any} refresher Refresher.
     */
    refreshParticipants(refresher: any): void {
        this.userProvider.invalidateParticipantsList(this.courseId).finally(() => {
            this.fetchData(true).finally(() => {
                refresher.complete();
            });
        });
    }

    /**
     * Navigate to a particular user profile.
     * @param {number} userId  User Id where to navigate.
     */
    gotoParticipant(userId: number): void {
        this.participantId = userId;
        this.splitviewCtrl.push('CoreUserProfilePage', {userId: userId, courseId: this.courseId});
    }
}
