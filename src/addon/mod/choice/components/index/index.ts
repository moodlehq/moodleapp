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

import { Component, Optional, Injector } from '@angular/core';
import { Content } from 'ionic-angular';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreCourseModuleMainActivityComponent } from '@core/course/classes/main-activity-component';
import { AddonModChoiceProvider } from '../../providers/choice';
import { AddonModChoiceOfflineProvider } from '../../providers/offline';
import { AddonModChoiceSyncProvider } from '../../providers/sync';

/**
 * Component that displays a choice.
 */
@Component({
    selector: 'addon-mod-choice-index',
    templateUrl: 'addon-mod-choice-index.html',
})
export class AddonModChoiceIndexComponent extends CoreCourseModuleMainActivityComponent {
    component = AddonModChoiceProvider.COMPONENT;
    moduleName = 'choice';

    choice: any;
    options = [];
    selectedOption: any;
    choiceNotOpenYet = false;
    choiceClosed = false;
    canEdit = false;
    canDelete = false;
    canSeeResults = false;
    data = [];
    labels = [];
    results = [];
    publishInfo: string; // Message explaining the user what will happen with his choices.

    protected userId: number;
    protected syncEventName = AddonModChoiceSyncProvider.AUTO_SYNCED;
    protected hasAnsweredOnline = false;
    protected now: number;

    constructor(injector: Injector, private choiceProvider: AddonModChoiceProvider, @Optional() content: Content,
            private choiceOffline: AddonModChoiceOfflineProvider, private choiceSync: AddonModChoiceSyncProvider,
            private timeUtils: CoreTimeUtilsProvider) {
        super(injector, content);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.userId = this.sitesProvider.getCurrentSiteUserId();

        this.loadContent(false, true).then(() => {
            if (!this.choice) {
                return;
            }
            this.choiceProvider.logView(this.choice.id, this.choice.name).then(() => {
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
            }).catch((error) => {
                // Ignore errors.
            });
        });
    }

    /**
     * Perform the invalidate content function.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected invalidateContent(): Promise<any> {
        const promises = [];

        promises.push(this.choiceProvider.invalidateChoiceData(this.courseId));

        if (this.choice) {
            promises.push(this.choiceProvider.invalidateOptions(this.choice.id));
            promises.push(this.choiceProvider.invalidateResults(this.choice.id));
        }

        return Promise.all(promises);
    }

    /**
     * Compares sync event data with current data to check if refresh content is needed.
     *
     * @param {any} syncEventData Data receiven on sync observer.
     * @return {boolean}          True if refresh is needed, false otherwise.
     */
    protected isRefreshSyncNeeded(syncEventData: any): boolean {
        if (this.choice && syncEventData.choiceId == this.choice.id && syncEventData.userId == this.userId) {
            this.domUtils.scrollToTop(this.content);

            return true;
        }

        return false;
    }

    /**
     * Download choice contents.
     *
     * @param  {boolean}      [refresh=false]    If it's refreshing content.
     * @param  {boolean}      [sync=false]       If it should try to sync.
     * @param  {boolean}      [showErrors=false] If show errors to the user of hide them.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchContent(refresh: boolean = false, sync: boolean = false, showErrors: boolean = false): Promise<any> {
        this.now = new Date().getTime();

        return this.choiceProvider.getChoice(this.courseId, this.module.id).then((choice) => {
            this.choice = choice;
            this.choice.timeopen = parseInt(choice.timeopen) * 1000;
            this.choice.openTimeReadable = this.timeUtils.userDate(choice.timeopen);
            this.choice.timeclose = parseInt(choice.timeclose) * 1000;
            this.choice.closeTimeReadable = this.timeUtils.userDate(choice.timeclose);

            this.description = choice.intro || choice.description;
            this.choiceNotOpenYet = choice.timeopen && choice.timeopen > this.now;
            this.choiceClosed = choice.timeclose && choice.timeclose <= this.now;

            this.dataRetrieved.emit(choice);

            if (sync) {
                // Try to synchronize the choice.
                return this.syncActivity(showErrors).then((updated) => {
                    if (updated) {
                        // Responses were sent, update the choice.
                        return this.choiceProvider.getChoice(this.courseId, this.module.id).then((choice) => {
                            this.choice = choice;
                        });
                    }
                });
            }
        }).then(() => {
            // Check if there are responses stored in offline.
            return this.choiceOffline.hasResponse(this.choice.id);
        }).then((hasOffline) => {
            this.hasOffline = hasOffline;

            // We need fetchOptions to finish before calling fetchResults because it needs hasAnsweredOnline variable.
            return this.fetchOptions(hasOffline).then(() => {
                return this.fetchResults();
            });
        }).then(() => {
            // All data obtained, now fill the context menu.
            this.fillContextMenu(refresh);
        });
    }

    /**
     * Convenience function to get choice options.
     *
     * @param {boolean} hasOffline True if there are responses stored offline.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected fetchOptions(hasOffline: boolean): Promise<any> {
        return this.choiceProvider.getOptions(this.choice.id).then((options) => {
            let promise;

            // Check if the user has answered (synced) to allow show results.
            this.hasAnsweredOnline = options.some((option) => option.checked);

            if (hasOffline) {
                promise = this.choiceOffline.getResponse(this.choice.id).then((response) => {
                    const optionsKeys = {};
                    options.forEach((option) => {
                        optionsKeys[option.id] = option;
                    });
                    // Update options with the offline data.
                    if (response.deleting) {
                        // Uncheck selected options.
                        if (response.responses.length > 0) {
                            // Uncheck all options selected in responses.
                            response.responses.forEach((selected) => {
                                if (optionsKeys[selected] && optionsKeys[selected].checked) {
                                    optionsKeys[selected].checked = false;
                                    optionsKeys[selected].countanswers--;
                                }
                            });
                        } else {
                            // On empty responses, uncheck all selected.
                            Object.keys(optionsKeys).forEach((key) => {
                                if (optionsKeys[key].checked) {
                                    optionsKeys[key].checked = false;
                                    optionsKeys[key].countanswers--;
                                }
                            });
                        }
                    } else {
                        // Uncheck all options to check again the offlines'.
                        Object.keys(optionsKeys).forEach((key) => {
                            if (optionsKeys[key].checked) {
                                optionsKeys[key].checked = false;
                                optionsKeys[key].countanswers--;
                            }
                        });
                        // Then check selected ones.
                        response.responses.forEach((selected) => {
                            if (optionsKeys[selected]) {
                                optionsKeys[selected].checked = true;
                                optionsKeys[selected].countanswers++;
                            }
                        });
                    }

                    // Convert it again to array.
                    return Object.keys(optionsKeys).map((key) => optionsKeys[key]);
                });
            } else {
                promise = Promise.resolve(options);
            }

            promise.then((options) => {
                const isOpen = this.isChoiceOpen();

                let hasAnswered = false;
                this.selectedOption = {id: -1}; // Single choice model.
                options.forEach((option) => {
                    if (option.checked) {
                        hasAnswered = true;
                        if (!this.choice.allowmultiple) {
                            this.selectedOption.id = option.id;
                        }
                    }
                });

                this.canEdit = isOpen && (this.choice.allowupdate || !hasAnswered);
                this.canDelete = isOpen && this.choice.allowupdate && hasAnswered;
                this.options = options;

                if (this.canEdit) {

                    // Calculate the publish info message.
                    switch (this.choice.showresults) {
                        case AddonModChoiceProvider.RESULTS_NOT:
                            this.publishInfo = 'addon.mod_choice.publishinfonever';
                            break;

                        case AddonModChoiceProvider.RESULTS_AFTER_ANSWER:
                            if (this.choice.publish == AddonModChoiceProvider.PUBLISH_ANONYMOUS) {
                                this.publishInfo = 'addon.mod_choice.publishinfoanonafter';
                            } else {
                                this.publishInfo = 'addon.mod_choice.publishinfofullafter';
                            }
                            break;

                        case AddonModChoiceProvider.RESULTS_AFTER_CLOSE:
                            if (this.choice.publish == AddonModChoiceProvider.PUBLISH_ANONYMOUS) {
                                this.publishInfo = 'addon.mod_choice.publishinfoanonclose';
                            } else {
                                this.publishInfo = 'addon.mod_choice.publishinfofullclose';
                            }
                            break;

                        default:
                            // No need to inform the user since it's obvious that the results are being published.
                            this.publishInfo = '';
                    }
                }
            });
        });
    }

    /**
     * Convenience function to get choice results.
     *
     * @return {Promise<any>} Resolved when done.
     */
    protected fetchResults(): Promise<any> {
        if (this.choiceNotOpenYet) {
            // Cannot see results yet.
            this.canSeeResults = false;

            return Promise.resolve();
        }

        return this.choiceProvider.getResults(this.choice.id).then((results) => {
            let hasVotes = false;
            this.data = [];
            this.labels = [];
            results.forEach((result) => {
                if (result.numberofuser > 0) {
                    hasVotes = true;
                }
                result.percentageamount = parseFloat(result.percentageamount).toFixed(1);
                this.data.push(result.numberofuser);
                this.labels.push(result.text);
            });
            this.canSeeResults = hasVotes || this.choiceProvider.canStudentSeeResults(this.choice, this.hasAnsweredOnline);
            this.results = results;
        });
    }

    /**
     * Check if a choice is open.
     *
     * @return {boolean} True if choice is open, false otherwise.
     */
    protected isChoiceOpen(): boolean {
        return (this.choice.timeopen === 0 || this.choice.timeopen <= this.now) &&
                (this.choice.timeclose === 0 || this.choice.timeclose > this.now);
    }

    /**
     * Return true if the user has selected at least one option.
     *
     * @return {boolean} True if the user has responded.
     */
    canSave(): boolean {
        if (this.choice.allowmultiple) {
            return this.options.some((option) => option.checked);
        } else {
            return this.selectedOption.id !== -1;
        }
    }

    /**
     * Save options selected.
     */
    save(): void {
        // Only show confirm if choice doesn't allow update.
        let promise;
        if (this.choice.allowupdate) {
            promise = Promise.resolve();
        } else {
            promise = this.domUtils.showConfirm(this.translate.instant('core.areyousure'));
        }

        promise.then(() => {
            const responses = [];
            if (this.choice.allowmultiple) {
                this.options.forEach((option) => {
                    if (option.checked) {
                        responses.push(option.id);
                    }
                });
            } else {
                responses.push(this.selectedOption.id);
            }

            const modal = this.domUtils.showModalLoading('core.sending', true);
            this.choiceProvider.submitResponse(this.choice.id, this.choice.name, this.courseId, responses).then((online) => {
                // Success!
                // Check completion since it could be configured to complete once the user answers the choice.
                this.courseProvider.checkModuleCompletion(this.courseId, this.module.completiondata);
                this.domUtils.scrollToTop(this.content);

                return this.dataUpdated(online);
            }).catch((message) => {
                this.domUtils.showErrorModalDefault(message, 'addon.mod_choice.cannotsubmit', true);
            }).finally(() => {
                modal.dismiss();
            });
        });
    }

    /**
     * Delete options selected.
     */
    delete(): void {
        this.domUtils.showConfirm(this.translate.instant('core.areyousure')).then(() => {
            const modal = this.domUtils.showModalLoading('core.sending', true);
            this.choiceProvider.deleteResponses(this.choice.id, this.choice.name, this.courseId).then(() => {
                this.domUtils.scrollToTop(this.content);

                // Refresh the data. Don't call dataUpdated because deleting an answer doesn't mark the choice as outdated.
                return this.refreshContent(false);
            }).catch((message) => {
                this.domUtils.showErrorModalDefault(message, 'addon.mod_choice.cannotsubmit', true);
            }).finally(() => {
                modal.dismiss();
            });
        }).catch(() => {
            // Ingore cancelled modal.
        });
    }

    /**
     * Function to call when some data has changed. It will refresh/prefetch data.
     *
     * @param {boolean} online Whether the data was sent to server or stored in offline.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected dataUpdated(online: boolean): Promise<any> {
        if (online && this.isPrefetched()) {
            // The choice is downloaded, update the data.
            return this.choiceSync.prefetchAfterUpdate(this.module, this.courseId).then(() => {
                // Update the view.
                this.showLoadingAndFetch(false, false);
            }).catch(() => {
                // Prefetch failed, refresh the data.
                return this.refreshContent(false);
            });
        } else {
            // Not downloaded, refresh the data.
            return this.refreshContent(false);
        }
    }

    /**
     * Performs the sync of the activity.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected sync(): Promise<any> {
        return this.choiceSync.syncChoice(this.choice.id, this.userId);
    }

    /**
     * Checks if sync has succeed from result sync data.
     *
     * @param  {any} result Data returned on the sync function.
     * @return {boolean} Whether it succeed or not.
     */
    protected hasSyncSucceed(result: any): boolean {
        return result.updated;
    }
}
