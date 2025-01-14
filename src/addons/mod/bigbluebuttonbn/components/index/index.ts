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
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { CoreApp } from '@services/app';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreArray } from '@singletons/array';
import { Translate } from '@singletons';
import {
    AddonModBBB,
    AddonModBBBData,
    AddonModBBBMeetingInfo,
    AddonModBBBRecordingPlaybackTypes,
} from '../../services/bigbluebuttonbn';
import { ADDON_MOD_BBB_COMPONENT } from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreOpener } from '@singletons/opener';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Component that displays a Big Blue Button activity.
 */
@Component({
    selector: 'addon-mod-bbb-index',
    templateUrl: 'index.html',
    styleUrl: 'index.scss',
})
export class AddonModBBBIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = ADDON_MOD_BBB_COMPONENT;
    pluginName = 'bigbluebuttonbn';
    bbb?: AddonModBBBData;
    groupInfo?: CoreGroupInfo;
    groupId = 0;
    meetingInfo?: AddonModBBBMeetingInfo;
    recordings?: Recording[];

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

    get showRoom(): boolean {
        return !!this.meetingInfo && (!this.meetingInfo.features || this.meetingInfo.features.showroom);
    }

    get showRecordings(): boolean {
        return !!this.meetingInfo && (!this.meetingInfo.features || this.meetingInfo.features.showrecordings);
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

        if (this.groupInfo.separateGroups && !this.groupInfo.groups.length) {
            throw new CoreError(Translate.instant('addon.mod_bigbluebuttonbn.view_nojoin'));
        }

        await this.fetchMeetingInfo();

        await this.fetchRecordings();
    }

    /**
     * Get meeting info.
     *
     * @param updateCache Whether to update info cached data (in server).
     * @returns Promise resolved when done.
     */
    async fetchMeetingInfo(updateCache?: boolean): Promise<void> {
        if (!this.bbb) {
            return;
        }

        try {
            this.meetingInfo = await AddonModBBB.getMeetingInfo(this.bbb.id, this.groupId, {
                cmId: this.module.id,
                updateCache,
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
     * Get recordings.
     *
     * @returns Promise resolved when done.
     */
    async fetchRecordings(): Promise<void> {
        if (!this.bbb || !this.showRecordings) {
            return;
        }

        const recordingsTable = await AddonModBBB.getRecordings(this.bbb.id, this.groupId, {
            cmId: this.module.id,
        });
        const columns = CoreArray.toObject(recordingsTable.columns, 'key');

        this.recordings = recordingsTable.parsedData.map(recordingData => {
            const details: RecordingDetail[] = [];
            const playbacksEl = convertTextToHTMLElement(String(recordingData.playback));
            const playbacks: RecordingPlayback[] = Array.from(playbacksEl.querySelectorAll('a')).map(playbackAnchor => ({
                name: playbackAnchor.textContent ?? '',
                url: playbackAnchor.href,
                icon: this.getPlaybackIcon(playbackAnchor),
            }));

            Object.entries(recordingData).forEach(([key, value]) => {
                const columnData = columns[key];
                if (!columnData || value === '' || key === 'actionbar' || key === 'playback') {
                    return;
                }

                if (columnData.formatter === 'customDate' && !isNaN(Number(value))) {
                    value = CoreTimeUtils.userDate(Number(value), 'core.strftimedaydate');
                } else if (columnData.allowHTML && typeof value === 'string') {
                    // If the HTML is empty, don't display it.
                    const valueElement = convertTextToHTMLElement(value);
                    if (!valueElement.querySelector('img') && (valueElement.textContent ?? '').trim() === '') {
                        return;
                    }

                    // Treat "quick edit" buttons, they aren't supported in the app.
                    const quickEditLink = valueElement.querySelector('.quickeditlink');
                    if (quickEditLink) {
                        // The first span in quick edit link contains the actual HTML, use it.
                        value = (quickEditLink.querySelector('span')?.innerHTML ?? '').trim();
                    }
                }

                details.push({
                    label: columnData.label,
                    value: String(value),
                    allowHTML: !!columnData.allowHTML,
                });
            });

            return {
                name: CoreText.cleanTags(String(recordingData.recording), { singleLine: true }),
                playbackLabel: columns.playback.label,
                playbacks,
                details,
                expanded: false,
            };
        });
    }

    /**
     * Get the playback icon.
     *
     * @param playbackAnchor Anchor element.
     * @returns Icon name.
     */
    protected getPlaybackIcon(playbackAnchor: HTMLAnchorElement): string {
        const type = playbackAnchor.dataset.target;
        switch (type) {
            case AddonModBBBRecordingPlaybackTypes.NOTES:
                return 'far-file-lines';
            case AddonModBBBRecordingPlaybackTypes.PODCAST:
                return 'fas-microphone-lines';
            case AddonModBBBRecordingPlaybackTypes.SCREENSHARE:
                return 'fas-display';
            case AddonModBBBRecordingPlaybackTypes.STATISTICS:
                return 'fas-chart-line';
            case AddonModBBBRecordingPlaybackTypes.VIDEO:
                return 'fas-video';
            case AddonModBBBRecordingPlaybackTypes.PRESENTATION:
            default:
                return 'fas-circle-play';
        }
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.bbb) {
            return; // Shouldn't happen.
        }

        await CorePromiseUtils.ignoreErrors(AddonModBBB.logView(this.bbb.id));

        this.analyticsLogEvent('mod_bigbluebuttonbn_view_bigbluebuttonbn');
    }

    /**
     * Update meeting info.
     *
     * @param updateCache Whether to update info cached data (in server).
     * @returns Promise resolved when done.
     */
    async updateMeetingInfo(updateCache?: boolean): Promise<void> {
        if (!this.bbb) {
            return;
        }

        this.showLoading = true;

        try {
            await AddonModBBB.invalidateAllGroupsMeetingInfo(this.bbb.id);

            await this.fetchMeetingInfo(updateCache);
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
            promises.push(AddonModBBB.invalidateAllGroupsRecordings(this.bbb.id));
        }

        await Promise.all(promises);
    }

    /**
     * Group changed, reload some data.
     *
     * @returns Promise resolved when done.
     */
    async groupChanged(): Promise<void> {
        this.showLoading = true;

        try {
            await this.fetchMeetingInfo();

            await this.fetchRecordings();
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * Join the room.
     *
     * @returns Promise resolved when done.
     */
    async joinRoom(): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            const joinUrl = await AddonModBBB.getJoinUrl(this.module.id, this.groupId);

            await CoreOpener.openInBrowser(joinUrl, {
                showBrowserWarning: false,
            });

            // Leave some time for the room to load.
            await CoreApp.waitForResume(10000);

            this.updateMeetingInfo(true);
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * End the meeting.
     *
     * @returns Promise resolved when done.
     */
    async endMeeting(): Promise<void> {
        if (!this.bbb) {
            return;
        }

        try {
            await CoreAlerts.confirm(Translate.instant('addon.mod_bigbluebuttonbn.end_session_confirm'), {
                header: Translate.instant('addon.mod_bigbluebuttonbn.end_session_confirm_title'),
                okText: Translate.instant('core.yes'),
            });
        } catch {
            // User canceled.
            return;
        }

        const modal = await CoreLoadings.show();

        try {
            await AddonModBBB.endMeeting(this.bbb.id, this.groupId);

            this.updateMeetingInfo();
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Toogle the visibility of a recording (expand/collapse).
     *
     * @param recording Recording.
     */
    toggle(recording: Recording): void {
        recording.expanded = !recording.expanded;
    }

    /**
     * Open a recording playback.
     *
     * @param event Click event.
     * @param playback Playback.
     */
    openPlayback(event: MouseEvent, playback: RecordingPlayback): void {
        event.preventDefault();
        event.stopPropagation();

        CoreSites.getCurrentSite()?.openInBrowserWithAutoLogin(playback.url);
    }

}

/**
 * Recording data.
 */
type Recording = {
    name: string;
    expanded: boolean;
    playbackLabel: string;
    playbacks: RecordingPlayback[];
    details: RecordingDetail[];
};

/**
 * Recording detail data.
 */
type RecordingDetail = {
    label: string;
    value: string;
    allowHTML: boolean;
};

/**
 * Recording playback data.
 */
type RecordingPlayback = {
    name: string;
    url: string;
    icon: string;
};
