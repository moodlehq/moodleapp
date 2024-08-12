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

import { Injectable } from '@angular/core';
import { CoreFileUploader, CoreFileUploaderStoreFilesResult } from '@features/fileuploader/services/fileuploader';
import { CoreSites, CoreSitesCommonWSOptions } from '@services/sites';
import { FileEntry, DirectoryEntry } from '@awesome-cordova-plugins/file/ngx';
import {
    AddonModAssignAssign,
    AddonModAssignSubmission,
    AddonModAssignParticipant,
    AddonModAssignSubmissionFeedback,
    AddonModAssign,
    AddonModAssignPlugin,
    AddonModAssignSavePluginData,
    AddonModAssignSubmissionStatusValues,
} from './assign';
import { AddonModAssignOffline } from './assign-offline';
import { CoreUtils } from '@services/utils/utils';
import { CoreFile } from '@services/file';
import { CoreCourseCommonModWSOptions } from '@features/course/services/course';
import { CoreGroups } from '@services/groups';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import { AddonModAssignFeedbackDelegate } from './feedback-delegate';
import { makeSingleton } from '@singletons';
import { CoreFormFields } from '@singletons/form';
import { CoreFileEntry } from '@services/file-helper';
import { ADDON_MOD_ASSIGN_COMPONENT } from '../constants';

/**
 * Service that provides some helper functions for assign.
 */
@Injectable({ providedIn: 'root' })
export class AddonModAssignHelperProvider {

    /**
     * Calculate the end time (timestamp) for an assign and submission.
     *
     * @param assign Assign instance.
     * @param submission Submission.
     * @returns End time.
     */
    calculateEndTime(assign: AddonModAssignAssign, submission?: AddonModAssignSubmissionFormatted): number {
        const timeDue = (submission?.timestarted || 0) + (assign.timelimit || 0);

        if (assign.duedate) {
            return Math.min(timeDue, assign.duedate);
        } else if (assign.cutoffdate) {
            return Math.min(timeDue, assign.cutoffdate);
        }

        return timeDue;
    }

    /**
     * Check if a submission can be edited in offline.
     *
     * @param assign Assignment.
     * @param submission Submission.
     * @returns Whether it can be edited offline.
     */
    async canEditSubmissionOffline(assign: AddonModAssignAssign, submission?: AddonModAssignSubmission): Promise<boolean> {
        if (!submission) {
            return false;
        }

        if (submission.status == AddonModAssignSubmissionStatusValues.NEW ||
                submission.status == AddonModAssignSubmissionStatusValues.REOPENED) {
            // It's a new submission, allow creating it in offline.
            return true;
        }

        let canEdit = true;

        const promises = submission.plugins
            ? submission.plugins.map((plugin) =>
                AddonModAssignSubmissionDelegate.canPluginEditOffline(assign, submission, plugin).then((canEditPlugin) => {
                    if (!canEditPlugin) {
                        canEdit = false;
                    }

                    return;
                }))
            : [];

        await Promise.all(promises);

        return canEdit;
    }

    /**
     * Clear plugins temporary data because a submission was cancelled.
     *
     * @param assign Assignment.
     * @param submission Submission to clear the data for.
     * @param inputData Data entered in the submission form.
     */
    clearSubmissionPluginTmpData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission | undefined,
        inputData: CoreFormFields,
    ): void {
        if (!submission) {
            return;
        }

        submission.plugins?.forEach((plugin) => {
            AddonModAssignSubmissionDelegate.clearTmpData(assign, submission, plugin, inputData);
        });
    }

    /**
     * Copy the data from last submitted attempt to the current submission.
     * Since we don't have any WS for that we'll have to re-submit everything manually.
     *
     * @param assign Assignment.
     * @param previousSubmission Submission to copy.
     * @returns Promise resolved when done.
     */
    async copyPreviousAttempt(assign: AddonModAssignAssign, previousSubmission: AddonModAssignSubmission): Promise<void> {
        const pluginData: AddonModAssignSavePluginData = {};
        const promises = previousSubmission.plugins
            ? previousSubmission.plugins.map((plugin) =>
                AddonModAssignSubmissionDelegate.copyPluginSubmissionData(assign, plugin, pluginData))
            : [];

        await Promise.all(promises);

        // We got the plugin data. Now we need to submit it.
        if (Object.keys(pluginData).length) {
            // There's something to save.
            return AddonModAssign.saveSubmissionOnline(assign.id, pluginData);
        }
    }

    /**
     * Create an empty feedback object.
     *
     * @returns Feedback.
     */
    createEmptyFeedback(): AddonModAssignSubmissionFeedback {
        return {
            grade: undefined,
            gradefordisplay: '',
            gradeddate: 0,
        };
    }

    /**
     * Create an empty submission object.
     *
     * @returns Submission.
     */
    createEmptySubmission(): AddonModAssignSubmissionFormatted {
        return {
            id: 0,
            userid: 0,
            attemptnumber: 0,
            timecreated: 0,
            timemodified: 0,
            status: AddonModAssignSubmissionStatusValues.NEW,
            groupid: 0,
        };
    }

    /**
     * Delete stored submission files for a plugin. See storeSubmissionFiles.
     *
     * @param assignId Assignment ID.
     * @param folderName Name of the plugin folder. Must be unique (both in submission and feedback plugins).
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async deleteStoredSubmissionFiles(assignId: number, folderName: string, userId?: number, siteId?: string): Promise<void> {
        const folderPath = await AddonModAssignOffline.getSubmissionPluginFolder(assignId, folderName, userId, siteId);

        await CoreFile.removeDir(folderPath);
    }

    /**
     * Delete all drafts of the feedback plugin data.
     *
     * @param assignId Assignment Id.
     * @param userId User Id.
     * @param feedback Feedback data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async discardFeedbackPluginData(
        assignId: number,
        userId: number,
        feedback: AddonModAssignSubmissionFeedback,
        siteId?: string,
    ): Promise<void> {

        const promises = feedback.plugins
            ? feedback.plugins.map((plugin) =>
                AddonModAssignFeedbackDelegate.discardPluginFeedbackData(assignId, userId, plugin, siteId))
            : [];

        await Promise.all(promises);
    }

    /**
     * Check if a submission has no content.
     *
     * @param assign Assignment object.
     * @param submission Submission to inspect.
     * @returns Whether the submission is empty.
     */
    isSubmissionEmpty(assign: AddonModAssignAssign, submission?: AddonModAssignSubmission): boolean {
        if (!submission) {
            return true;
        }

        const anyNotEmpty = submission.plugins?.some((plugin) =>
            !AddonModAssignSubmissionDelegate.isPluginEmpty(assign, plugin));

        // If any plugin is not empty, we consider that the submission is not empty either.
        if (anyNotEmpty) {
            return false;
        }

        // If all the plugins were empty (or there were no plugins), we consider the submission to be empty.
        return true;
    }

    /**
     * Check whether the edited submission has no content.
     *
     * @param assign Assignment object.
     * @param submission Submission to inspect.
     * @param inputData Data entered in the submission form.
     * @returns Whether the submission is empty.
     */
    isSubmissionEmptyForEdit(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        inputData: CoreFormFields,
    ): boolean {
        const anyNotEmpty = submission.plugins?.some((plugin) =>
            !AddonModAssignSubmissionDelegate.isPluginEmptyForEdit(assign, plugin, inputData));

        // If any plugin is not empty, we consider that the submission is not empty either.
        if (anyNotEmpty) {
            return false;
        }

        // If all the plugins were empty (or there were no plugins), we consider the submission to be empty.
        return true;
    }

    /**
     * List the participants for a single assignment, with some summary info about their submissions.
     *
     * @param assign Assignment object.
     * @param groupId Group Id.
     * @param options Other options.
     * @returns Promise resolved with the list of participants and summary of submissions.
     */
    async getParticipants(
        assign: AddonModAssignAssign,
        groupId?: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModAssignParticipant[]> {

        groupId = groupId || 0;
        options.siteId = options.siteId || CoreSites.getCurrentSiteId();

        // Create new options including all existing ones.
        const modOptions: CoreCourseCommonModWSOptions = { cmId: assign.cmid, ...options };

        const participants = await AddonModAssign.listParticipants(assign.id, groupId, modOptions);

        if (groupId || participants && participants.length > 0) {
            return participants;
        }

        // If no participants returned and all groups specified, get participants by groups.
        const groupsInfo = await CoreGroups.getActivityGroupInfo(assign.cmid, false, undefined, modOptions.siteId);

        const participantsIndexed: {[id: number]: AddonModAssignParticipant} = {};

        const promises = groupsInfo.groups
            ? groupsInfo.groups.map((userGroup) =>
                AddonModAssign.listParticipants(assign.id, userGroup.id, modOptions).then((participantsFromList) => {
                    // Do not get repeated users.
                    participantsFromList.forEach((participant) => {
                        participantsIndexed[participant.id] = participant;
                    });

                    return;
                }))
            :[];

        await Promise.all(promises);

        return CoreUtils.objectToArray(participantsIndexed);
    }

    /**
     * Get plugin config from assignment config.
     *
     * @param assign Assignment object including all config.
     * @param subtype Subtype name (assignsubmission or assignfeedback)
     * @param type Name of the subplugin.
     * @returns Object containing all configurations of the subplugin selected.
     */
    getPluginConfig(assign: AddonModAssignAssign, subtype: string, type: string): AddonModAssignPluginConfig {
        const configs: AddonModAssignPluginConfig = {};

        assign.configs.forEach((config) => {
            if (config.subtype == subtype && config.plugin == type) {
                configs[config.name] = config.value;
            }
        });

        return configs;
    }

    /**
     * Get enabled subplugins.
     *
     * @param assign Assignment object including all config.
     * @param subtype Subtype name (assignsubmission or assignfeedback)
     * @returns List of enabled plugins for the assign.
     */
    getPluginsEnabled(assign: AddonModAssignAssign, subtype: string): AddonModAssignPlugin[] {
        const enabled: AddonModAssignPlugin[] = [];

        assign.configs.forEach((config) => {
            if (config.subtype == subtype && config.name == 'enabled' && parseInt(config.value, 10) === 1) {
                // Format the plugin objects.
                enabled.push({
                    type: config.plugin,
                    name: config.plugin,
                });
            }
        });

        return enabled;
    }

    /**
     * Get a list of stored submission files. See storeSubmissionFiles.
     *
     * @param assignId Assignment ID.
     * @param folderName Name of the plugin folder. Must be unique (both in submission and feedback plugins).
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the files.
     */
    async getStoredSubmissionFiles(
        assignId: number,
        folderName: string,
        userId?: number,
        siteId?: string,
    ): Promise<(FileEntry | DirectoryEntry)[]> {
        const folderPath = await AddonModAssignOffline.getSubmissionPluginFolder(assignId, folderName, userId, siteId);

        return CoreFile.getDirectoryContents(folderPath);
    }

    /**
     * Get the size that will be uploaded to perform an attempt copy.
     *
     * @param assign Assignment.
     * @param previousSubmission Submission to copy.
     * @returns Promise resolved with the size.
     */
    async getSubmissionSizeForCopy(assign: AddonModAssignAssign, previousSubmission: AddonModAssignSubmission): Promise<number> {
        let totalSize = 0;

        const promises = previousSubmission.plugins
            ? previousSubmission.plugins.map((plugin) =>
                AddonModAssignSubmissionDelegate.getPluginSizeForCopy(assign, plugin).then((size) => {
                    totalSize += (size || 0);

                    return;
                }))
            : [];

        await Promise.all(promises);

        return totalSize;
    }

    /**
     * Get the size that will be uploaded to save a submission.
     *
     * @param assign Assignment.
     * @param submission Submission to check data.
     * @param inputData Data entered in the submission form.
     * @returns Promise resolved with the size.
     */
    async getSubmissionSizeForEdit(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission,
        inputData: CoreFormFields,
    ): Promise<number> {

        let totalSize = 0;

        const promises = submission.plugins
            ? submission.plugins.map((plugin) =>
                AddonModAssignSubmissionDelegate.getPluginSizeForEdit(assign, submission, plugin, inputData)
                    .then((size) => {
                        totalSize += (size || 0);

                        return;
                    }))
            : [];

        await Promise.all(promises);

        return totalSize;
    }

    /**
     * Get user data for submissions since they only have userid.
     *
     * @param assign Assignment object.
     * @param submissions Submissions to get the data for.
     * @param groupId Group Id.
     * @param options Other options.
     * @returns Promise always resolved. Resolve param is the formatted submissions.
     */
    async getSubmissionsUserData(
        assign: AddonModAssignAssign,
        submissions: AddonModAssignSubmissionFormatted[] = [],
        groupId?: number,
        options: CoreSitesCommonWSOptions = {},
    ): Promise<AddonModAssignSubmissionFormatted[]> {
        const participants = await this.getParticipants(assign, groupId, options);

        const blind = !!assign.blindmarking && !assign.revealidentities;
        const teamsubmission = !!assign.teamsubmission;

        if (teamsubmission) {
            // On team submission discard user submissions.
            submissions = submissions.filter((submission) => submission.userid == 0);
        }

        return participants.map((participant) => {
            const groupId = participant.groupid ??
                (participant.groups && participant.groups[0] ? participant.groups[0].id : 0);

            const foundSubmission = submissions.find((submission) => {
                if (teamsubmission) {
                    return submission.groupid == groupId;
                }

                const submitId = submission.userid && submission.userid > 0 ? submission.userid : submission.blindid;

                return participant.id == submitId;
            });

            let submission: AddonModAssignSubmissionFormatted | undefined;
            if (!foundSubmission) {
                // Create submission if none.
                submission = this.createEmptySubmission();
                submission.groupid = groupId;
                submission.status = participant.submitted
                    ? AddonModAssignSubmissionStatusValues.SUBMITTED
                    : AddonModAssignSubmissionStatusValues.NEW;
            } else {
                submission = Object.assign({}, foundSubmission);
            }

            submission.submitid = participant.id;

            if (!blind) {
                submission.userid = participant.id;
                submission.userfullname = participant.fullname;
                submission.userprofileimageurl = participant.profileimageurl;
            } else {
                submission.blindid = participant.id;
            }

            submission.manyGroups = !!participant.groups && participant.groups.length > 1;
            submission.noGroups = !!participant.groups && participant.groups.length == 0;
            if (participant.groupname) {
                submission.groupid = participant.groupid;
                submission.groupname = participant.groupname;
            }

            return submission;

        });
    }

    /**
     * Check if the feedback data has changed for a certain submission and assign.
     *
     * @param assign Assignment.
     * @param submission The submission.
     * @param feedback Feedback data.
     * @param userId The user ID.
     * @returns Promise resolved with true if data has changed, resolved with false otherwise.
     */
    async hasFeedbackDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission | AddonModAssignSubmissionFormatted | undefined,
        feedback: AddonModAssignSubmissionFeedback,
        userId: number,
    ): Promise<boolean> {
        if (!submission || !feedback.plugins) {
            return false;
        }

        let hasChanged = false;

        const promises = feedback.plugins.map((plugin) =>
            this.prepareFeedbackPluginData(assign.id, userId, feedback).then(async (inputData) => {
                const changed = await CoreUtils.ignoreErrors(
                    AddonModAssignFeedbackDelegate.hasPluginDataChanged(assign, submission, plugin, inputData, userId),
                    false,
                );
                if (changed) {
                    hasChanged = true;
                }

                return;
            }));

        await CoreUtils.allPromises(promises);

        return hasChanged;
    }

    /**
     * Check if the submission data has changed for a certain submission and assign.
     *
     * @param assign Assignment.
     * @param submission Submission to check data.
     * @param inputData Data entered in the submission form.
     * @returns Promise resolved with true if data has changed, resolved with false otherwise.
     */
    async hasSubmissionDataChanged(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission | undefined,
        inputData: CoreFormFields,
    ): Promise<boolean> {
        if (!submission) {
            return false;
        }

        let hasChanged = false;

        const promises = submission.plugins
            ? submission.plugins.map((plugin) =>
                AddonModAssignSubmissionDelegate.hasPluginDataChanged(assign, submission, plugin, inputData)
                    .then((changed) => {
                        if (changed) {
                            hasChanged = true;
                        }

                        return;
                    }).catch(() => {
                        // Ignore errors.
                    }))
            : [];

        await CoreUtils.allPromises(promises);

        return hasChanged;
    }

    /**
     * Prepare and return the plugin data to send for a certain feedback and assign.
     *
     * @param assignId Assignment Id.
     * @param userId User Id.
     * @param feedback Feedback data.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with plugin data to send to server.
     */
    async prepareFeedbackPluginData(
        assignId: number,
        userId: number,
        feedback: AddonModAssignSubmissionFeedback,
        siteId?: string,
    ): Promise<AddonModAssignSavePluginData> {

        const pluginData: CoreFormFields = {};
        const promises = feedback.plugins
            ? feedback.plugins.map((plugin) =>
                AddonModAssignFeedbackDelegate.preparePluginFeedbackData(assignId, userId, plugin, pluginData, siteId))
            : [];

        await Promise.all(promises);

        return pluginData;
    }

    /**
     * Prepare and return the plugin data to send for a certain submission and assign.
     *
     * @param assign Assignment.
     * @param submission Submission to check data.
     * @param inputData Data entered in the submission form.
     * @param offline True to prepare the data for an offline submission, false otherwise.
     * @returns Promise resolved with plugin data to send to server.
     */
    async prepareSubmissionPluginData(
        assign: AddonModAssignAssign,
        submission: AddonModAssignSubmission | undefined,
        inputData: CoreFormFields,
        offline = false,
    ): Promise<AddonModAssignSavePluginData> {

        if (!submission || !submission.plugins) {
            return {};
        }

        const pluginData: AddonModAssignSavePluginData = {};
        const promises = submission.plugins.map((plugin) =>
            AddonModAssignSubmissionDelegate.preparePluginSubmissionData(
                assign,
                submission,
                plugin,
                inputData,
                pluginData,
                offline,
            ));

        await Promise.all(promises);

        return pluginData;
    }

    /**
     * Given a list of files (either online files or local files), store the local files in a local folder
     * to be submitted later.
     *
     * @param assignId Assignment ID.
     * @param folderName Name of the plugin folder. Must be unique (both in submission and feedback plugins).
     * @param files List of files.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved if success, rejected otherwise.
     */
    async storeSubmissionFiles(
        assignId: number,
        folderName: string,
        files: CoreFileEntry[],
        userId?: number,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult> {
        // Get the folder where to store the files.
        const folderPath = await AddonModAssignOffline.getSubmissionPluginFolder(assignId, folderName, userId, siteId);

        return CoreFileUploader.storeFilesToUpload(folderPath, files);
    }

    /**
     * Upload a file to a draft area. If the file is an online file it will be downloaded and then re-uploaded.
     *
     * @param assignId Assignment ID.
     * @param file Online file or local FileEntry.
     * @param itemId Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the itemId.
     */
    uploadFile(assignId: number, file: CoreFileEntry, itemId?: number, siteId?: string): Promise<number> {
        return CoreFileUploader.uploadOrReuploadFile(file, itemId, ADDON_MOD_ASSIGN_COMPONENT, assignId, siteId);
    }

    /**
     * Given a list of files (either online files or local files), upload them to a draft area and return the draft ID.
     * Online files will be downloaded and then re-uploaded.
     * If there are no files to upload it will return a fake draft ID (1).
     *
     * @param assignId Assignment ID.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the itemId.
     */
    uploadFiles(assignId: number, files: CoreFileEntry[], siteId?: string): Promise<number> {
        return CoreFileUploader.uploadOrReuploadFiles(files, ADDON_MOD_ASSIGN_COMPONENT, assignId, siteId);
    }

    /**
     * Upload or store some files, depending if the user is offline or not.
     *
     * @param assignId Assignment ID.
     * @param folderName Name of the plugin folder. Must be unique (both in submission and feedback plugins).
     * @param files List of files.
     * @param offline True if files sould be stored for offline, false to upload them.
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     */
    async uploadOrStoreFiles(
        assignId: number,
        folderName: string,
        files: CoreFileEntry[],
        offline: true,
        userId?: number,
        siteId?: string,
    ): Promise<CoreFileUploaderStoreFilesResult>;
    async uploadOrStoreFiles(
        assignId: number,
        folderName: string,
        files: CoreFileEntry[],
        offline: false,
        userId?: number,
        siteId?: string,
    ): Promise<number>;
    async uploadOrStoreFiles(
        assignId: number,
        folderName: string,
        files: CoreFileEntry[],
        offline: boolean,
        userId?: number,
        siteId?: string,
    ): Promise<number | CoreFileUploaderStoreFilesResult>;
    async uploadOrStoreFiles(
        assignId: number,
        folderName: string,
        files: CoreFileEntry[],
        offline: boolean,
        userId?: number,
        siteId?: string,
    ): Promise<number | CoreFileUploaderStoreFilesResult> {

        if (offline) {
            return this.storeSubmissionFiles(assignId, folderName, files, userId, siteId);
        }

        return this.uploadFiles(assignId, files, siteId);
    }

}
export const AddonModAssignHelper = makeSingleton(AddonModAssignHelperProvider);

/**
 * Assign submission with some calculated data.
 */
export type AddonModAssignSubmissionFormatted =
    Omit<AddonModAssignSubmission, 'userid'|'groupid'> & {
        userid?: number; // Student id.
        groupid?: number; // Group id.
        blindid?: number; // Calculated in the app. Blindid of the user that did the submission.
        submitid?: number; // Calculated in the app. Userid or blindid of the user that did the submission.
        userfullname?: string; // Calculated in the app. Full name of the user that did the submission.
        userprofileimageurl?: string; // Calculated in the app. Avatar of the user that did the submission.
        manyGroups?: boolean; // Calculated in the app. Whether the user belongs to more than 1 group.
        noGroups?: boolean; // Calculated in the app. Whether the user doesn't belong to any group.
        groupname?: string; // Calculated in the app. Name of the group the submission belongs to.
    };

/**
 * Assignment plugin config.
 */
export type AddonModAssignPluginConfig = {[name: string]: string};
