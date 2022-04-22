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

import { Component, OnInit, Optional } from '@angular/core';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { Translate } from '@singletons';
import { AddonModBBB, AddonModBBBData, AddonModBBBMeetingInfoWSResponse, AddonModBBBService } from '../../services/bigbluebuttonbn';

/**
 * Component that displays a Big Blue Button activity.
 */
@Component({
    selector: 'addon-mod-bbb-index',
    templateUrl: 'index.html',
    styleUrls: ['index.scss'],
})
export class AddonModBBBIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = AddonModBBBService.COMPONENT;
    moduleName = 'bigbluebuttonbn';
    bbb?: AddonModBBBData;
    groupInfo?: CoreGroupInfo;
    groupId = 0;
    meetingInfo?: AddonModBBBMeetingInfoWSResponse;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModBBBIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent();
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        this.bbb = await AddonModBBB.getBBB(this.courseId, this.module.id);

        this.description = this.bbb.intro;
        this.dataRetrieved.emit(this.bbb);

        this.groupInfo = await CoreGroups.getActivityGroupInfo(this.module.id, false);

        this.groupId = CoreGroups.validateGroupId(this.groupId, this.groupInfo);

        await this.fetchMeetingInfo();
    }

    /**
     * Get meeting info.
     *
     * @return Promise resolved when done.
     */
    async fetchMeetingInfo(): Promise<void> {
        if (!this.bbb) {
            return;
        }

        try {
            this.meetingInfo = await AddonModBBB.getMeetingInfo(this.bbb.id, this.groupId, {
                cmId: this.module.id,
            });

            if (this.meetingInfo.statusrunning && this.meetingInfo.userlimit > 0) {
                const count = (this.meetingInfo.participantcount || 0) + (this.meetingInfo.moderatorcount || 0);
                if (count === this.meetingInfo.userlimit) {
                    this.meetingInfo.statusmessage = Translate.instant('addon.mod_bigbluebuttonbn.userlimitreached');
                }
            }
        } catch (error) {
            if (error && error.errorcode === 'restrictedcontextexception') {
                error.message = Translate.instant('addon.mod_bigbluebuttonbn.view_nojoin');
            }

            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.bbb) {
            return; // Shouldn't happen.
        }

        await AddonModBBB.logView(this.bbb.id, this.bbb.name);
    }

    /**
     * Update meeting info.
     *
     * @return Promise resolved when done.
     */
    async updateMeetingInfo(): Promise<void> {
        if (!this.bbb) {
            return;
        }

        this.showLoading = true;

        try {
            await AddonModBBB.invalidateAllGroupsMeetingInfo(this.bbb.id);

            await this.fetchMeetingInfo();
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModBBB.invalidateBBBs(this.courseId));
        promises.push(CoreGroups.invalidateActivityGroupInfo(this.module.id));

        if (this.bbb) {
            promises.push(AddonModBBB.invalidateAllGroupsMeetingInfo(this.bbb.id));
        }

        await Promise.all(promises);
    }

    /**
     * Group changed, reload some data.
     *
     * @return Promise resolved when done.
     */
    async groupChanged(): Promise<void> {
        this.showLoading = true;

        try {
            await this.fetchMeetingInfo();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * Join the room.
     *
     * @return Promise resolved when done.
     */
    async joinRoom(): Promise<void> {
        const modal = await CoreDomUtils.showModalLoading();

        try {
            const joinUrl = await AddonModBBB.getJoinUrl(this.module.id, this.groupId);

            CoreUtils.openInBrowser(joinUrl, {
                showBrowserWarning: false,
            });

            this.updateMeetingInfo();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * End the meeting.
     *
     * @return Promise resolved when done.
     */
    async endMeeting(): Promise<void> {
        if (!this.bbb) {
            return;
        }

        try {
            await CoreDomUtils.showConfirm(
                Translate.instant('addon.mod_bigbluebuttonbn.end_session_confirm'),
                Translate.instant('addon.mod_bigbluebuttonbn.end_session_confirm_title'),
                Translate.instant('core.yes'),
            );
        } catch {
            // User canceled.
            return;
        }

        const modal = await CoreDomUtils.showModalLoading();

        try {
            await AddonModBBB.endMeeting(this.bbb.id, this.groupId);

            this.updateMeetingInfo();
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
        } finally {
            modal.dismiss();
        }
    }

}
