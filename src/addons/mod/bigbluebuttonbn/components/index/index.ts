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

import { Component, OnInit, computed, signal } from '@angular/core';
import { CoreError } from '@classes/errors/error';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreApp } from '@services/app';
import { CoreGroupInfo, CoreGroups } from '@services/groups';
import { CoreSites } from '@services/sites';
import { CoreText } from '@static/text';
import { CoreTime } from '@static/time';
import type { CoreCourseModuleDate } from '@features/course/services/course';
import { CoreArray } from '@static/array';
import { Translate } from '@singletons';
import {
    AddonModBBB,
    AddonModBBBData,
    AddonModBBBMeetingInfo,
    AddonModBBBRecordingPlaybackTypes,
} from '../../services/bigbluebuttonbn';
import { ADDON_MOD_BBB_COMPONENT_LEGACY, ADDON_MOD_BBB_MODNAME } from '../../constants';
import { CoreLoadings } from '@services/overlays/loadings';
import { convertTextToHTMLElement } from '@/core/utils/create-html-element';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreOpener } from '@static/opener';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreToasts, ToastDuration } from '@services/overlays/toasts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreCourseModuleInfoComponent } from '@features/course/components/module-info/module-info';
import { CoreCourseModuleNavigationComponent } from '@features/course/components/module-navigation/module-navigation';
import { CoreUrl } from '@static/url';

/**
 * Component that displays a Big Blue Button activity.
 */
@Component({
    selector: 'addon-mod-bbb-index',
    templateUrl: 'index.html',
    styleUrl: 'index.scss',
    imports: [
        CoreSharedModule,
        CoreCourseModuleInfoComponent,
        CoreCourseModuleNavigationComponent,
    ],
})
export class AddonModBBBIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = ADDON_MOD_BBB_COMPONENT_LEGACY;
    pluginName = ADDON_MOD_BBB_MODNAME;

    readonly bbb = signal<AddonModBBBData | undefined>(undefined);
    readonly groupInfo = signal<CoreGroupInfo | undefined>(undefined);
    readonly groupId = signal(0);
    readonly meetingInfo = signal<AddonModBBBMeetingInfo | undefined>(undefined);
    readonly recordings = signal<Recording[] | undefined>(undefined);
    readonly isRefreshingMeetingInfo = signal(false);
    readonly moderatorHasJoined = signal(false);

    readonly showRoom = computed(() => {
        const meetingInfo = this.meetingInfo();

        return !!meetingInfo && (!meetingInfo.features || !!meetingInfo.features.showroom);
    });

    readonly showRecordings = computed(() => {
        const meetingInfo = this.meetingInfo();

        return !!meetingInfo && (!meetingInfo.features || !!meetingInfo.features.showrecordings);
    });

    readonly userLimitReached = computed(() => {
        const meetingInfo = this.meetingInfo();

        return !!meetingInfo && !!meetingInfo.statusrunning && meetingInfo.userlimit > 0 &&
            ((meetingInfo.participantcount || 0) + (meetingInfo.moderatorcount || 0)) >= meetingInfo.userlimit;
    });

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
        this.moderatorHasJoined.set(false);

        const bbb = await AddonModBBB.getBBB(this.courseId, this.module.id);
        this.bbb.set(bbb);

        this.description = bbb.intro;
        this.dataRetrieved.emit(bbb);

        const groupInfo = await CoreGroups.getActivityGroupInfo(this.module.id, false);
        this.groupInfo.set(groupInfo);

        this.groupId.set(CoreGroups.validateGroupId(this.groupId(), groupInfo));

        if (groupInfo.separateGroups && !groupInfo.groups.length) {
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
        const bbb = this.bbb();
        if (!bbb) {
            return;
        }

        try {
            const meetingInfo = await AddonModBBB.getMeetingInfo(bbb.id, this.groupId(), {
                cmId: this.module.id,
                updateCache,
            });

            this.setStatusMessage(meetingInfo);

            // If the module doesn't include activity dates, populate them from meetingInfo.
            // As of LMS v5.1.0, these dates are normally provided by the module.
            if (this.module && (!this.module.dates || !this.module.dates.length)) {
                const site = CoreSites.getCurrentSite();
                if (site && !site.isVersionGreaterEqualThan('5.1')) {
                    const dates: CoreCourseModuleDate[] = [];
                    const now = CoreTime.timestamp();

                    if (meetingInfo.openingtime) {
                        const openLabelId = meetingInfo.openingtime > now ? 'activitydate:opens' : 'activitydate:opened';
                        dates.push({
                            dataid: 'timeopen',
                            label: Translate.instant(`core.course.${openLabelId}`),
                            timestamp: meetingInfo.openingtime,
                        });
                    }

                    if (meetingInfo.closingtime) {
                        const closeLabelId = meetingInfo.closingtime > now ? 'activitydate:closes' : 'activitydate:closed';
                        dates.push({
                            dataid: 'timeclose',
                            label: Translate.instant(`core.course.${closeLabelId}`),
                            timestamp: meetingInfo.closingtime,
                        });
                    }

                    if (dates.length) {
                        this.module.dates = dates;
                    }
                }
            }

            this.meetingInfo.set(meetingInfo);
        } catch (error) {
            if (error && error.errorcode === 'restrictedcontextexception') {
                error.message = Translate.instant('addon.mod_bigbluebuttonbn.view_nojoin');
            }

            throw error;
        }
    }

    /**
     * Change the status message of the meeting info if needed.
     *
     * @param meetingInfo Meeting info to change its status message if needed.
     */
    protected setStatusMessage(meetingInfo: AddonModBBBMeetingInfo): void {
        // User limit wasn't calculated properly before MDL-76303 (4.0.8, 4.1.3).
        if (this.userLimitReached()) {
            meetingInfo.statusmessage = Translate.instant('addon.mod_bigbluebuttonbn.userlimitreached');

            return;
        }

        // Wait for moderator has more priority than open/close dates, when it shouldn't. See MDL-88273.
        // Calculate the right status message.
        if (meetingInfo.openingtime && meetingInfo.openingtime > CoreTime.timestamp()) {
            meetingInfo.statusmessage = Translate.instant('addon.mod_bigbluebuttonbn.view_message_conference_not_started');
            meetingInfo.usermustwaittojoin = false;

            return;
        }

        if (meetingInfo.closingtime && meetingInfo.closingtime < CoreTime.timestamp()) {
            meetingInfo.statusmessage = Translate.instant('addon.mod_bigbluebuttonbn.view_message_conference_has_ended');
            meetingInfo.usermustwaittojoin = false;

            return;
        }
    }

    /**
     * Get recordings.
     *
     * @returns Promise resolved when done.
     */
    async fetchRecordings(): Promise<void> {
        const bbb = this.bbb();
        if (!bbb || !this.showRecordings()) {
            return;
        }

        const recordingsTable = await AddonModBBB.getRecordings(bbb.id, this.groupId(), {
            cmId: this.module.id,
        });
        const columns = CoreArray.toObject(recordingsTable.columns, 'key');

        const recordings = recordingsTable.parsedData.map(recordingData => {
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
                    value = CoreTime.userDate(Number(value), 'core.strftimedaydate');
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
                timestamp: recordingData.date ? Number(recordingData.date) : undefined,
            };
        });

        this.recordings.set(recordings);
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
        const bbb = this.bbb();
        if (!bbb) {
            return; // Shouldn't happen.
        }

        await CorePromiseUtils.ignoreErrors(AddonModBBB.logView(bbb.id));

        this.analyticsLogEvent('mod_bigbluebuttonbn_view_bigbluebuttonbn');
    }

    /**
     * Update meeting info.
     *
     * @param updateCache Whether to update info cached data (in server).
     * @returns Promise resolved when done.
     */
    async updateMeetingInfo(updateCache?: boolean): Promise<void> {
        const bbb = this.bbb();
        if (!bbb) {
            return;
        }

        this.showLoading = true;

        try {
            await AddonModBBB.invalidateAllGroupsMeetingInfo(bbb.id);

            await this.fetchMeetingInfo(updateCache);
        } finally {
            this.showLoading = false;
        }
    }

    /**
     * Refresh meeting info while in "waiting for moderator" state.
     */
    async refreshWaitingMeetingInfo(): Promise<void> {
        const bbb = this.bbb();
        if (!bbb || this.isRefreshingMeetingInfo()) {
            return;
        }

        this.isRefreshingMeetingInfo.set(true);

        try {
            await AddonModBBB.invalidateAllGroupsMeetingInfo(bbb.id);
            await this.fetchMeetingInfo(false);

            const meetingInfo = this.meetingInfo();
            if (!meetingInfo) {
                return;
            }

            if (meetingInfo.canjoin) {
                await CoreToasts.show({
                    message: 'addon.mod_bigbluebuttonbn.moderatorhasjoinedshort',
                    translateMessage: true,
                    duration: ToastDuration.LONG,
                });

                this.moderatorHasJoined.set(true);
            } else if (!this.userLimitReached()){
                await CoreToasts.show({
                    message: 'addon.mod_bigbluebuttonbn.stillwaitingformoderator',
                    translateMessage: true,
                    duration: ToastDuration.LONG,
                });
            }
        } catch (error) {
            CoreAlerts.showError(error);
        } finally {
            this.isRefreshingMeetingInfo.set(false);
        }
    }

    /**
     * @inheritdoc
     */
    protected async invalidateContent(): Promise<void> {
        const promises: Promise<void>[] = [];

        promises.push(AddonModBBB.invalidateBBBs(this.courseId));
        promises.push(CoreGroups.invalidateActivityGroupInfo(this.module.id));

        const bbb = this.bbb();
        if (bbb) {
            promises.push(AddonModBBB.invalidateAllGroupsMeetingInfo(bbb.id));
            promises.push(AddonModBBB.invalidateAllGroupsRecordings(bbb.id));
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
            const joinUrl = await AddonModBBB.getJoinUrl(this.module.id, this.groupId());

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
        const bbb = this.bbb();
        if (!bbb) {
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
            await AddonModBBB.endMeeting(bbb.id, this.groupId());

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
        this.recordings.update(recordings =>
            recordings?.map(r => r === recording ? { ...r, expanded: !r.expanded } : r));
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

        let url = playback.url;
        if (!url.match(/[&?]group=/)) {
            url = CoreUrl.addParamsToUrl(url, { group: String(this.groupId()) });
        }

        CoreSites.getCurrentSite()?.openInBrowserWithAutoLogin(url);
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
    timestamp?: number;
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
