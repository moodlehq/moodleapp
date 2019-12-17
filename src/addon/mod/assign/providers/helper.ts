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
import { CoreFileProvider } from '@providers/file';
import { CoreGroupsProvider } from '@providers/groups';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { AddonModAssignFeedbackDelegate } from './feedback-delegate';
import { AddonModAssignSubmissionDelegate } from './submission-delegate';
import {
    AddonModAssignProvider, AddonModAssignAssign, AddonModAssignSubmission, AddonModAssignParticipant,
    AddonModAssignSubmissionFeedback
} from './assign';
import { AddonModAssignOfflineProvider } from './assign-offline';

/**
 * Service that provides some helper functions for assign.
 */
@Injectable()
export class AddonModAssignHelperProvider {
    protected logger;

    constructor(logger: CoreLoggerProvider, private sitesProvider: CoreSitesProvider, private fileProvider: CoreFileProvider,
            private assignProvider: AddonModAssignProvider, private utils: CoreUtilsProvider,
            private assignOffline: AddonModAssignOfflineProvider, private feedbackDelegate: AddonModAssignFeedbackDelegate,
            private submissionDelegate: AddonModAssignSubmissionDelegate, private fileUploaderProvider: CoreFileUploaderProvider,
            private groupsProvider: CoreGroupsProvider) {
        this.logger = logger.getInstance('AddonModAssignHelperProvider');
    }

    /**
     * Check if a submission can be edited in offline.
     *
     * @param assign Assignment.
     * @param submission Submission.
     * @return Whether it can be edited offline.
     */
    canEditSubmissionOffline(assign: AddonModAssignAssign, submission: AddonModAssignSubmission): Promise<boolean> {
        if (!submission) {
            return Promise.resolve(false);
        }

        if (submission.status == AddonModAssignProvider.SUBMISSION_STATUS_NEW ||
                submission.status == AddonModAssignProvider.SUBMISSION_STATUS_REOPENED) {
            // It's a new submission, allow creating it in offline.
            return Promise.resolve(true);
        }

        const promises = [];
        let canEdit = true;

        for (let i = 0; i < submission.plugins.length; i++) {
            const plugin = submission.plugins[i];
            promises.push(this.submissionDelegate.canPluginEditOffline(assign, submission, plugin).then((canEditPlugin) => {
                if (!canEditPlugin) {
                    canEdit = false;
                }
            }));
        }

        return Promise.all(promises).then(() => {
            return canEdit;
        });
    }

    /**
     * Clear plugins temporary data because a submission was cancelled.
     *
     * @param assign Assignment.
     * @param submission Submission to clear the data for.
     * @param inputData Data entered in the submission form.
     */
    clearSubmissionPluginTmpData(assign: AddonModAssignAssign, submission: AddonModAssignSubmission, inputData: any): void {
        submission.plugins.forEach((plugin) => {
            this.submissionDelegate.clearTmpData(assign, submission, plugin, inputData);
        });
    }

    /**
     * Copy the data from last submitted attempt to the current submission.
     * Since we don't have any WS for that we'll have to re-submit everything manually.
     *
     * @param assign Assignment.
     * @param previousSubmission Submission to copy.
     * @return Promise resolved when done.
     */
    copyPreviousAttempt(assign: AddonModAssignAssign, previousSubmission: AddonModAssignSubmission): Promise<any> {
        const pluginData = {},
            promises = [];

        previousSubmission.plugins.forEach((plugin) => {
            promises.push(this.submissionDelegate.copyPluginSubmissionData(assign, plugin, pluginData));
        });

        return Promise.all(promises).then(() => {
            // We got the plugin data. Now we need to submit it.
            if (Object.keys(pluginData).length) {
                // There's something to save.
                return this.assignProvider.saveSubmissionOnline(assign.id, pluginData);
            }
        });
    }

    /**
     * Create an empty feedback object.
     *
     * @return Feedback.
     */
    createEmptyFeedback(): AddonModAssignSubmissionFeedback {
        return {
            grade: undefined,
            gradefordisplay: undefined,
            gradeddate: undefined
        };
    }

    /**
     * Create an empty submission object.
     *
     * @return Submission.
     */
    createEmptySubmission(): AddonModAssignSubmissionFormatted {
        return {
            id: undefined,
            userid: undefined,
            attemptnumber: undefined,
            timecreated: undefined,
            timemodified: undefined,
            status: undefined,
            groupid: undefined
        };
    }

    /**
     * Delete stored submission files for a plugin. See storeSubmissionFiles.
     *
     * @param assignId Assignment ID.
     * @param folderName Name of the plugin folder. Must be unique (both in submission and feedback plugins).
     * @param userId User ID. If not defined, site's current user.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    deleteStoredSubmissionFiles(assignId: number, folderName: string, userId?: number, siteId?: string): Promise<any> {
        return this.assignOffline.getSubmissionPluginFolder(assignId, folderName, userId, siteId).then((folderPath) => {
            return this.fileProvider.removeDir(folderPath);
        });
    }

    /**
     * Delete all drafts of the feedback plugin data.
     *
     * @param assignId Assignment Id.
     * @param userId User Id.
     * @param feedback Feedback data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done.
     */
    discardFeedbackPluginData(assignId: number, userId: number, feedback: AddonModAssignSubmissionFeedback,
            siteId?: string): Promise<any> {

        const promises = [];

        feedback.plugins.forEach((plugin) => {
            promises.push(this.feedbackDelegate.discardPluginFeedbackData(assignId, userId, plugin, siteId));
        });

        return Promise.all(promises);
    }

    /**
     * Check if a submission has no content.
     *
     * @param assign Assignment object.
     * @param submission Submission to inspect.
     * @return Whether the submission is empty.
     */
    isSubmissionEmpty(assign: AddonModAssignAssign, submission?: AddonModAssignSubmission): boolean {
        if (!submission) {
            return true;
        }

        for (const plugin of submission.plugins) {
            // If any plugin is not empty, we consider that the submission is not empty either.
            if (!this.submissionDelegate.isPluginEmpty(assign, plugin)) {
                return false;
            }
        }

        // If all the plugins were empty (or there were no plugins), we consider the submission to be empty.
        return true;
    }

    /**
     * List the participants for a single assignment, with some summary info about their submissions.
     *
     * @param assign Assignment object.
     * @param groupId Group Id.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the list of participants and summary of submissions.
     */
    getParticipants(assign: AddonModAssignAssign, groupId?: number, ignoreCache?: boolean, siteId?: string)
            : Promise<AddonModAssignParticipant[]> {

        groupId = groupId || 0;
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        return this.assignProvider.listParticipants(assign.id, groupId, ignoreCache, siteId).then((participants) => {
            if (groupId || participants && participants.length > 0) {
                return participants;
            }

            // If no participants returned and all groups specified, get participants by groups.
            return this.groupsProvider.getActivityGroupInfo(assign.cmid, false, undefined, siteId).then((info) => {
                const promises = [],
                    participants: {[id: number]: AddonModAssignParticipant} = {};

                info.groups.forEach((userGroup) => {
                    promises.push(this.assignProvider.listParticipants(assign.id, userGroup.id, ignoreCache, siteId)
                            .then((parts) => {
                        // Do not get repeated users.
                        parts.forEach((participant) => {
                            participants[participant.id] = participant;
                        });
                    }));
                });

                return Promise.all(promises).then(() => {
                    return this.utils.objectToArray(participants);
                });
            });
        });
    }

    /**
     * Get plugin config from assignment config.
     *
     * @param assign Assignment object including all config.
     * @param subtype Subtype name (assignsubmission or assignfeedback)
     * @param type Name of the subplugin.
     * @return Object containing all configurations of the subplugin selected.
     */
    getPluginConfig(assign: AddonModAssignAssign, subtype: string, type: string): {[name: string]: string} {
        const configs: {[name: string]: string} = {};

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
     * @return List of enabled plugins for the assign.
     */
    getPluginsEnabled(assign: AddonModAssignAssign, subtype: string): any[] {
        const enabled = [];

        assign.configs.forEach((config) => {
            if (config.subtype == subtype && config.name == 'enabled' && parseInt(config.value, 10) === 1) {
                // Format the plugin objects.
                enabled.push({
                    type: config.plugin
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
     * @return Promise resolved with the files.
     */
    getStoredSubmissionFiles(assignId: number, folderName: string, userId?: number, siteId?: string): Promise<any[]> {
        return this.assignOffline.getSubmissionPluginFolder(assignId, folderName, userId, siteId).then((folderPath) => {
            return this.fileProvider.getDirectoryContents(folderPath);
        });
    }

    /**
     * Get the size that will be uploaded to perform an attempt copy.
     *
     * @param assign Assignment.
     * @param previousSubmission Submission to copy.
     * @return Promise resolved with the size.
     */
    getSubmissionSizeForCopy(assign: AddonModAssignAssign, previousSubmission: AddonModAssignSubmission): Promise<number> {
        const promises = [];
        let totalSize = 0;

        previousSubmission.plugins.forEach((plugin) => {
            promises.push(this.submissionDelegate.getPluginSizeForCopy(assign, plugin).then((size) => {
                totalSize += size;
            }));
        });

        return Promise.all(promises).then(() => {
            return totalSize;
        });
    }

    /**
     * Get the size that will be uploaded to save a submission.
     *
     * @param assign Assignment.
     * @param submission Submission to check data.
     * @param inputData Data entered in the submission form.
     * @return Promise resolved with the size.
     */
    getSubmissionSizeForEdit(assign: AddonModAssignAssign, submission: AddonModAssignSubmission, inputData: any): Promise<number> {

        const promises = [];
        let totalSize = 0;

        submission.plugins.forEach((plugin) => {
            promises.push(this.submissionDelegate.getPluginSizeForEdit(assign, submission, plugin, inputData).then((size) => {
                totalSize += size;
            }));
        });

        return Promise.all(promises).then(() => {
            return totalSize;
        });
    }

    /**
     * Get user data for submissions since they only have userid.
     *
     * @param assign Assignment object.
     * @param submissions Submissions to get the data for.
     * @param groupId Group Id.
     * @param ignoreCache True if it should ignore cached data (it will always fail in offline or server down).
     * @param siteId Site id (empty for current site).
     * @return Promise always resolved. Resolve param is the formatted submissions.
     */
    getSubmissionsUserData(assign: AddonModAssignAssign, submissions: AddonModAssignSubmissionFormatted[], groupId?: number,
            ignoreCache?: boolean, siteId?: string): Promise<AddonModAssignSubmissionFormatted[]> {

        return this.getParticipants(assign, groupId).then((parts) => {
            const blind = assign.blindmarking && !assign.revealidentities;
            const promises = [];
            const result: AddonModAssignSubmissionFormatted[] = [];
            const participants: {[id: number]: AddonModAssignParticipant} = this.utils.arrayToObject(parts, 'id');

            submissions.forEach((submission) => {
                submission.submitid = submission.userid > 0 ? submission.userid : submission.blindid;
                if (submission.submitid <= 0) {
                    return;
                }

                const participant = participants[submission.submitid];
                if (participant) {
                    delete participants[submission.submitid];
                } else {
                    // Avoid permission denied error. Participant not found on list.
                    return;
                }

                if (!blind) {
                    submission.userfullname = participant.fullname;
                    submission.userprofileimageurl = participant.profileimageurl;
                }

                submission.manyGroups = !!participant.groups && participant.groups.length > 1;
                submission.noGroups = !!participant.groups && participant.groups.length == 0;
                if (participant.groupname) {
                    submission.groupid = participant.groupid;
                    submission.groupname = participant.groupname;
                }

                let promise;
                if (submission.userid > 0 && blind) {
                    // Blind but not blinded! (Moodle < 3.1.1, 3.2).
                    delete submission.userid;

                    promise = this.assignProvider.getAssignmentUserMappings(assign.id, submission.submitid, ignoreCache, siteId).
                            then((blindId) => {
                        submission.blindid = blindId;
                    });
                }

                promise = promise || Promise.resolve();

                promises.push(promise.then(() => {
                    // Add to the list.
                    if (submission.userfullname || submission.blindid) {
                        result.push(submission);
                    }
                }));
            });

            return Promise.all(promises).then(() => {
                // Create a submission for each participant left in the list (the participants already treated were removed).
                this.utils.objectToArray(participants).forEach((participant: AddonModAssignParticipant) => {
                    const submission = this.createEmptySubmission();

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
                    submission.status = participant.submitted ? AddonModAssignProvider.SUBMISSION_STATUS_SUBMITTED :
                            AddonModAssignProvider.SUBMISSION_STATUS_NEW;

                    result.push(submission);
                });

                return result;
            });
        });
    }

    /**
     * Check if the feedback data has changed for a certain submission and assign.
     *
     * @param assign Assignment.
     * @param submission The submission.
     * @param feedback Feedback data.
     * @param userId The user ID.
     * @return Promise resolved with true if data has changed, resolved with false otherwise.
     */
    hasFeedbackDataChanged(assign: AddonModAssignAssign, submission: AddonModAssignSubmission,
            feedback: AddonModAssignSubmissionFeedback, userId: number): Promise<boolean> {

        const promises = [];
        let hasChanged = false;

        feedback.plugins.forEach((plugin) => {
            promises.push(this.prepareFeedbackPluginData(assign.id, userId, feedback).then((inputData) => {
                return this.feedbackDelegate.hasPluginDataChanged(assign, submission, plugin, inputData, userId).then((changed) => {
                    if (changed) {
                        hasChanged = true;
                    }
                });
            }).catch(() => {
                // Ignore errors.
            }));
        });

        return this.utils.allPromises(promises).then(() => {
            return hasChanged;
        });
    }

    /**
     * Check if the submission data has changed for a certain submission and assign.
     *
     * @param assign Assignment.
     * @param submission Submission to check data.
     * @param inputData Data entered in the submission form.
     * @return Promise resolved with true if data has changed, resolved with false otherwise.
     */
    hasSubmissionDataChanged(assign: AddonModAssignAssign, submission: AddonModAssignSubmission, inputData: any)
            : Promise<boolean> {

        const promises = [];
        let hasChanged = false;

        submission.plugins.forEach((plugin) => {
            promises.push(this.submissionDelegate.hasPluginDataChanged(assign, submission, plugin, inputData).then((changed) => {
                if (changed) {
                    hasChanged = true;
                }
            }).catch(() => {
                // Ignore errors.
            }));
        });

        return this.utils.allPromises(promises).then(() => {
            return hasChanged;
        });
    }

    /**
     * Prepare and return the plugin data to send for a certain feedback and assign.
     *
     * @param assignId Assignment Id.
     * @param userId User Id.
     * @param feedback Feedback data.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with plugin data to send to server.
     */
    prepareFeedbackPluginData(assignId: number, userId: number, feedback: AddonModAssignSubmissionFeedback, siteId?: string)
            : Promise<any> {

        const pluginData = {},
            promises = [];

        feedback.plugins.forEach((plugin) => {
            promises.push(this.feedbackDelegate.preparePluginFeedbackData(assignId, userId, plugin, pluginData, siteId));
        });

        return Promise.all(promises).then(() => {
            return pluginData;
        });
    }

    /**
     * Prepare and return the plugin data to send for a certain submission and assign.
     *
     * @param assign Assignment.
     * @param submission Submission to check data.
     * @param inputData Data entered in the submission form.
     * @param offline True to prepare the data for an offline submission, false otherwise.
     * @return Promise resolved with plugin data to send to server.
     */
    prepareSubmissionPluginData(assign: AddonModAssignAssign, submission: AddonModAssignSubmission, inputData: any,
            offline?: boolean): Promise<any> {

        const pluginData = {},
            promises = [];

        submission.plugins.forEach((plugin) => {
            promises.push(this.submissionDelegate.preparePluginSubmissionData(assign, submission, plugin, inputData, pluginData,
                    offline));
        });

        return Promise.all(promises).then(() => {
            return pluginData;
        });
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
     * @return Promise resolved if success, rejected otherwise.
     */
    storeSubmissionFiles(assignId: number, folderName: string, files: any[], userId?: number, siteId?: string): Promise<any> {
        // Get the folder where to store the files.
        return this.assignOffline.getSubmissionPluginFolder(assignId, folderName, userId, siteId).then((folderPath) => {
            return this.fileUploaderProvider.storeFilesToUpload(folderPath, files);
        });
    }

    /**
     * Upload a file to a draft area. If the file is an online file it will be downloaded and then re-uploaded.
     *
     * @param assignId Assignment ID.
     * @param file Online file or local FileEntry.
     * @param itemId Draft ID to use. Undefined or 0 to create a new draft ID.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the itemId.
     */
    uploadFile(assignId: number, file: any, itemId?: number, siteId?: string): Promise<number> {
        return this.fileUploaderProvider.uploadOrReuploadFile(file, itemId, AddonModAssignProvider.COMPONENT, assignId, siteId);
    }

    /**
     * Given a list of files (either online files or local files), upload them to a draft area and return the draft ID.
     * Online files will be downloaded and then re-uploaded.
     * If there are no files to upload it will return a fake draft ID (1).
     *
     * @param assignId Assignment ID.
     * @param files List of files.
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved with the itemId.
     */
    uploadFiles(assignId: number, files: any[], siteId?: string): Promise<number> {
        return this.fileUploaderProvider.uploadOrReuploadFiles(files, AddonModAssignProvider.COMPONENT, assignId, siteId);
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
     * @return Promise resolved when done.
     */
    uploadOrStoreFiles(assignId: number, folderName: string, files: any[], offline?: boolean, userId?: number, siteId?: string)
            : Promise<any> {

        if (offline) {
            return this.storeSubmissionFiles(assignId, folderName, files, userId, siteId);
        } else {
            return this.uploadFiles(assignId, files, siteId);
        }
    }
}

/**
 * Assign submission with some calculated data.
 */
export type AddonModAssignSubmissionFormatted = AddonModAssignSubmission & {
    blindid?: number; // Calculated in the app. Blindid of the user that did the submission.
    submitid?: number; // Calculated in the app. Userid or blindid of the user that did the submission.
    userfullname?: string; // Calculated in the app. Full name of the user that did the submission.
    userprofileimageurl?: string; // Calculated in the app. Avatar of the user that did the submission.
    manyGroups?: boolean; // Calculated in the app. Whether the user belongs to more than 1 group.
    noGroups?: boolean; // Calculated in the app. Whether the user doesn't belong to any group.
    groupname?: string; // Calculated in the app. Name of the group the submission belongs to.
};
