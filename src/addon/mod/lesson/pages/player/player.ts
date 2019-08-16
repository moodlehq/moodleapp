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

import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { IonicPage, NavParams, Content, PopoverController, ModalController, Modal, NavController } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreSyncProvider } from '@providers/sync';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTimeUtilsProvider } from '@providers/utils/time';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { AddonModLessonProvider } from '../../providers/lesson';
import { AddonModLessonOfflineProvider } from '../../providers/lesson-offline';
import { AddonModLessonSyncProvider } from '../../providers/lesson-sync';
import { AddonModLessonHelperProvider } from '../../providers/helper';

/**
 * Page that allows attempting and reviewing a lesson.
 */
@IonicPage({ segment: 'addon-mod-lesson-player' })
@Component({
    selector: 'page-addon-mod-lesson-player',
    templateUrl: 'player.html',
})
export class AddonModLessonPlayerPage implements OnInit, OnDestroy {
    @ViewChild(Content) content: Content;

    component = AddonModLessonProvider.COMPONENT;
    LESSON_EOL = AddonModLessonProvider.LESSON_EOL;
    questionForm: FormGroup; // The FormGroup for question pages.
    title: string; // The page title.
    lesson: any; // The lesson object.
    currentPage: number; // Current page being viewed.
    review: boolean; // Whether the user is reviewing.
    messages: any[]; // Messages to display to the user.
    menuModal: Modal; // Modal to navigate through the pages.
    canManage: boolean; // Whether the user can manage the lesson.
    retake: number; // Current retake number.
    showRetake: boolean; // Whether the retake number needs to be displayed.
    lessonWidth: string; // Width of the lesson (if slideshow mode).
    lessonHeight: string; // Height of the lesson (if slideshow mode).
    endTime: number; // End time of the lesson if it's timed.
    pageData: any; // Current page data.
    pageContent: string; // Current page contents.
    pageButtons: any[]; // List of buttons of the current page.
    question: any; // Question of the current page (if it's a question page).
    eolData: any; // Data for EOL page (if current page is EOL).
    processData: any; // Data to display after processing a page.
    loaded: boolean; // Whether data has been loaded.
    displayMenu: boolean; // Whether the lesson menu should be displayed.
    originalData: any; // Original question data. It is used to check if data has changed.

    protected courseId: number; // The course ID the lesson belongs to.
    protected lessonId: number; // Lesson ID.
    protected password: string; // Lesson password (if any).
    protected forceLeave = false; // If true, don't perform any check when leaving the view.
    protected offline: boolean; // Whether we are in offline mode.
    protected accessInfo: any; // Lesson access info.
    protected jumps: any; // All possible jumps.
    protected mediaFile: any; // Media file of the lesson.
    protected firstPageLoaded: boolean; // Whether the first page has been loaded.
    protected loadingMenu: boolean; // Whether the lesson menu is being loaded.
    protected lessonPages: any[]; // Lesson pages (for the lesson menu).

    constructor(protected navParams: NavParams, logger: CoreLoggerProvider, protected translate: TranslateService,
            protected eventsProvider: CoreEventsProvider, protected sitesProvider: CoreSitesProvider,
            protected syncProvider: CoreSyncProvider, protected domUtils: CoreDomUtilsProvider, popoverCtrl: PopoverController,
            protected timeUtils: CoreTimeUtilsProvider, protected lessonProvider: AddonModLessonProvider,
            protected lessonHelper: AddonModLessonHelperProvider, protected lessonSync: AddonModLessonSyncProvider,
            protected lessonOfflineProvider: AddonModLessonOfflineProvider, protected cdr: ChangeDetectorRef,
            modalCtrl: ModalController, protected navCtrl: NavController, protected appProvider: CoreAppProvider,
            protected utils: CoreUtilsProvider, protected urlUtils: CoreUrlUtilsProvider, protected fb: FormBuilder) {

        this.lessonId = navParams.get('lessonId');
        this.courseId = navParams.get('courseId');
        this.password = navParams.get('password');
        this.review = !!navParams.get('review');
        this.currentPage = navParams.get('pageId');

        // Block the lesson so it cannot be synced.
        this.syncProvider.blockOperation(this.component, this.lessonId);

        // Create the navigation modal.
        this.menuModal = modalCtrl.create('AddonModLessonMenuModalPage', {
            page: this
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Fetch the Lesson data.
        this.fetchLessonData().then((success) => {
            if (success) {
                // Review data loaded or new retake started, remove any retake being finished in sync.
                this.lessonSync.deleteRetakeFinishedInSync(this.lessonId);
            }
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        // Unblock the lesson so it can be synced.
        this.syncProvider.unblockOperation(this.component, this.lessonId);
    }

    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    ionViewCanLeave(): boolean | Promise<void> {
        if (this.forceLeave) {
            return true;
        }

        if (this.question && !this.eolData && !this.processData && this.originalData) {
            // Question shown. Check if there is any change.
            if (!this.utils.basicLeftCompare(this.questionForm.getRawValue(), this.originalData, 3)) {
                 return this.domUtils.showConfirm(this.translate.instant('core.confirmcanceledit'));
            }
        }

        return Promise.resolve();
    }

    /**
     * A button was clicked.
     *
     * @param {any} data Button data.
     */
    buttonClicked(data: any): void {
        this.processPage(data);
    }

    /**
     * Call a function and go offline if allowed and the call fails.
     *
     * @param {Function} func Function to call.
     * @param {any[]} args Arguments to pass to the function.
     * @param {number} offlineParamPos Position of the offline parameter in the args.
     * @param {number} [jumpsParamPos] Position of the jumps parameter in the args.
     * @return {Promise<any>} Promise resolved in success, rejected otherwise.
     */
    protected callFunction(func: Function, args: any[], offlineParamPos: number, jumpsParamPos?: number): Promise<any> {
        return func.apply(func, args).catch((error) => {
            if (!this.offline && !this.review && this.lessonProvider.isLessonOffline(this.lesson) &&
                    !this.utils.isWebServiceError(error)) {
                // If it fails, go offline.
                this.offline = true;

                // Get the possible jumps now.
                return this.lessonProvider.getPagesPossibleJumps(this.lesson.id, true).then((jumpList) => {
                    this.jumps = jumpList;

                    // Call the function again with offline set to true and the new jumps.
                    args[offlineParamPos] = true;
                    if (typeof jumpsParamPos != 'undefined') {
                        args[jumpsParamPos] = this.jumps;
                    }

                    return func.apply(func, args);
                });
            }

            return Promise.reject(error);
        });
    }

    /**
     * Change the page from menu or when continuing from a feedback page.
     *
     * @param {number} pageId Page to load.
     * @param {boolean} [ignoreCurrent] If true, allow loading current page.
     */
    changePage(pageId: number, ignoreCurrent?: boolean): void {
        if (!ignoreCurrent && !this.eolData && this.currentPage == pageId) {
            // Page already loaded, stop.
            return;
        }

        this.loaded = true;
        this.messages = [];

        this.loadPage(pageId).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading page');
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Get the lesson data and load the page.
     *
     * @return {Promise<boolean>} Promise resolved with true if success, resolved with false otherwise.
     */
    protected fetchLessonData(): Promise<boolean> {
        // Wait for any ongoing sync to finish. We won't sync a lesson while it's being played.
        return this.lessonSync.waitForSync(this.lessonId).then(() => {
            return this.lessonProvider.getLessonById(this.courseId, this.lessonId);
        }).then((lessonData) => {
            this.lesson = lessonData;
            this.title = this.lesson.name; // Temporary title.

            // If lesson has offline data already, use offline mode.
            return this.lessonOfflineProvider.hasOfflineData(this.lessonId);
        }).then((offlineMode) => {
            this.offline = offlineMode;

            if (!offlineMode && !this.appProvider.isOnline() && this.lessonProvider.isLessonOffline(this.lesson) && !this.review) {
                // Lesson doesn't have offline data, but it allows offline and the device is offline. Use offline mode.
                this.offline = true;
            }

            return this.callFunction(this.lessonProvider.getAccessInformation.bind(this.lessonProvider),
                    [this.lesson.id, this.offline, true], 1);
        }).then((info) => {
            const promises = [];

            this.accessInfo = info;
            this.canManage = info.canmanage;
            this.retake = info.attemptscount;
            this.showRetake = !this.currentPage && this.retake > 0; // Only show it in first page if it isn't the first retake.

            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                // If it's a password protected lesson and we have the password, allow playing it.
                const preventReason = this.lessonProvider.getPreventAccessReason(info, !!this.password, this.review);
                if (preventReason) {
                    // Lesson cannot be played, show message and go back.
                    return Promise.reject(preventReason.message);
                }
            }

            if (this.review && this.navParams.get('retake') != info.attemptscount - 1) {
                // Reviewing a retake that isn't the last one. Error.
                return Promise.reject(this.translate.instant('addon.mod_lesson.errorreviewretakenotlast'));
            }

            if (this.password) {
                // Lesson uses password, get the whole lesson object.
                promises.push(this.callFunction(this.lessonProvider.getLessonWithPassword.bind(this.lessonProvider),
                        [this.lesson.id, this.password, true, this.offline, true], 3).then((lesson) => {
                    this.lesson = lesson;
                }));
            }

            if (this.offline) {
                // Offline mode, get the list of possible jumps to allow navigation.
                promises.push(this.lessonProvider.getPagesPossibleJumps(this.lesson.id, true).then((jumpList) => {
                    this.jumps = jumpList;
                }));
            }

            return Promise.all(promises);
        }).then(() => {
            this.mediaFile = this.lesson.mediafiles && this.lesson.mediafiles[0];

            this.lessonWidth = this.lesson.slideshow ? this.domUtils.formatPixelsSize(this.lesson.mediawidth) : '';
            this.lessonHeight = this.lesson.slideshow ? this.domUtils.formatPixelsSize(this.lesson.mediaheight) : '';

            return this.launchRetake(this.currentPage);
        }).then(() => {
            return true;
        }).catch((error) => {
            // An error occurred.
            let promise;

            if (this.review && this.navParams.get('retake') && this.utils.isWebServiceError(error)) {
                // The user cannot review the retake. Unmark the retake as being finished in sync.
                promise = this.lessonSync.deleteRetakeFinishedInSync(this.lessonId);
            } else {
                promise = Promise.resolve();
            }

            return promise.then(() => {
                this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
                this.forceLeave = true;
                this.navCtrl.pop();

                return false;
            });
        });
    }

    /**
     * Finish the retake.
     *
     * @param {boolean} [outOfTime] Whether the retake is finished because the user ran out of time.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected finishRetake(outOfTime?: boolean): Promise<any> {
        let promise;

        this.messages = [];

        if (this.offline && this.appProvider.isOnline()) {
            // Offline mode but the app is online. Try to sync the data.
            promise = this.lessonSync.syncLesson(this.lesson.id, true, true).then((result) => {
                if (result.warnings && result.warnings.length) {
                    const error = result.warnings[0];

                    // Some data was deleted. Check if the retake has changed.
                    return this.lessonProvider.getAccessInformation(this.lesson.id).then((info) => {
                        if (info.attemptscount != this.accessInfo.attemptscount) {
                            // The retake has changed. Leave the view and show the error.
                            this.forceLeave = true;
                            this.navCtrl.pop();

                            return Promise.reject(error);
                        }

                        // Retake hasn't changed, show the warning and finish the retake in offline.
                        this.offline = false;
                        this.domUtils.showErrorModal(error);
                    });
                }

                this.offline = false;
            }, () => {
                // Ignore errors.
            });
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            // Now finish the retake.
            const args = [this.lesson, this.courseId, this.password, outOfTime, this.review, this.offline, this.accessInfo];

            return this.callFunction(this.lessonProvider.finishRetake.bind(this.lessonProvider), args, 5);
        }).then((data) => {
            this.title = this.lesson.name;
            this.eolData = data.data;
            this.messages = this.messages.concat(data.messages);
            this.processData = undefined;

            // Format activity link if present.
            if (this.eolData && this.eolData.activitylink) {
                this.eolData.activitylink.value = this.lessonHelper.formatActivityLink(this.eolData.activitylink.value);
            }

            // Format review lesson if present.
            if (this.eolData && this.eolData.reviewlesson) {
                const params = this.urlUtils.extractUrlParams(this.eolData.reviewlesson.value);

                if (!params || !params.pageid) {
                    // No pageid in the URL, the user cannot review (probably didn't answer any question).
                    delete this.eolData.reviewlesson;
                } else {
                    this.eolData.reviewlesson.pageid = params.pageid;
                }
            }
        });
    }

    /**
     * Jump to a certain page after performing an action.
     *
     * @param {number} pageId The page to load.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected jumpToPage(pageId: number): Promise<any> {
        if (pageId === 0) {
            // Not a valid page, return to entry view.
            // This happens, for example, when the user clicks to go to previous page and there is no previous page.
            this.forceLeave = true;
            this.navCtrl.pop();

            return Promise.resolve();
        } else if (pageId == AddonModLessonProvider.LESSON_EOL) {
            // End of lesson reached.
            return this.finishRetake();
        }

        // Load new page.
        this.messages = [];

        return this.loadPage(pageId);
    }

    /**
     * Start or continue a retake.
     *
     * @param {number} pageId The page to load.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected launchRetake(pageId: number): Promise<any> {
        let promise;

        if (this.review) {
            // Review mode, no need to launch the retake.
            promise = Promise.resolve({});
        } else if (!this.offline) {
            // Not in offline mode, launch the retake.
            promise = this.lessonProvider.launchRetake(this.lesson.id, this.password, pageId);
        } else {
            // Check if there is a finished offline retake.
            promise = this.lessonOfflineProvider.hasFinishedRetake(this.lesson.id).then((finished) => {
                if (finished) {
                    // Always show EOL page.
                    pageId = AddonModLessonProvider.LESSON_EOL;
                }

                return {};
            });
        }

        return promise.then((data) => {
            this.currentPage = pageId || this.accessInfo.firstpageid;
            this.messages = data.messages || [];

            if (this.lesson.timelimit && !this.accessInfo.canmanage) {
                // Get the last lesson timer.
                return this.lessonProvider.getTimers(this.lesson.id, false, true).then((timers) => {
                    this.endTime = timers[timers.length - 1].starttime + this.lesson.timelimit;
                });
            }
        }).then(() => {
            return this.loadPage(this.currentPage);
        });
    }

    /**
     * Load the lesson menu.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadMenu(): Promise<any> {
        if (this.loadingMenu) {
            // Already loading.
            return;
        }

        this.loadingMenu = true;

        const args = [this.lessonId, this.password, this.offline, true];

        return this.callFunction(this.lessonProvider.getPages.bind(this.lessonProvider), args, 2).then((pages) => {
            this.lessonPages = pages.map((entry) => {
                return entry.page;
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading menu.');
        }).finally(() => {
            this.loadingMenu = false;
        });
    }

    /**
     * Load a certain page.
     *
     * @param {number} pageId The page to load.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected loadPage(pageId: number): Promise<any> {
        if (pageId == AddonModLessonProvider.LESSON_EOL) {
            // End of lesson reached.
            return this.finishRetake();
        }

        const args = [this.lesson, pageId, this.password, this.review, true, this.offline, true, this.accessInfo, this.jumps];

        return this.callFunction(this.lessonProvider.getPageData.bind(this.lessonProvider), args, 5, 8).then((data) => {
            if (data.newpageid == AddonModLessonProvider.LESSON_EOL) {
                // End of lesson reached.
                return this.finishRetake();
            }

            this.pageData = data;
            this.title = data.page.title;
            this.pageContent = this.lessonHelper.getPageContentsFromPageData(data);
            this.loaded = true;
            this.currentPage = pageId;
            this.messages = this.messages.concat(data.messages);

            // Page loaded, hide EOL and feedback data if shown.
            this.eolData = this.processData = undefined;

            if (this.lessonProvider.isQuestionPage(data.page.type)) {
                // Create an empty FormGroup without controls, they will be added in getQuestionFromPageData.
                this.questionForm = this.fb.group({});
                this.pageButtons = [];
                this.question = this.lessonHelper.getQuestionFromPageData(this.questionForm, data);
                this.originalData = this.questionForm.getRawValue(); // Use getRawValue to include disabled values.
            } else {
                this.pageButtons = this.lessonHelper.getPageButtonsFromHtml(data.pagecontent);
                this.question = undefined;
                this.originalData = undefined;
            }

            if (data.displaymenu && !this.displayMenu) {
                // Load the menu.
                this.loadMenu();
            }
            this.displayMenu = !!data.displaymenu;

            if (!this.firstPageLoaded) {
                this.firstPageLoaded = true;
            } else {
                this.showRetake = false;
            }
        });
    }

    /**
     * Process a page, sending some data.
     *
     * @param {any} data The data to send.
     * @return {Promise<any>} Promise resolved when done.
     */
    protected processPage(data: any): Promise<any> {
        this.loaded = false;

        const args = [this.lesson, this.courseId, this.pageData, data, this.password, this.review, this.offline, this.accessInfo,
                this.jumps];

        return this.callFunction(this.lessonProvider.processPage.bind(this.lessonProvider), args, 6, 8).then((result) => {
            if (!this.offline && !this.review && this.lessonProvider.isLessonOffline(this.lesson)) {
                // Lesson allows offline and the user changed some data in server. Update cached data.
                const retake = this.accessInfo.attemptscount;

                if (this.lessonProvider.isQuestionPage(this.pageData.page.type)) {
                    this.lessonProvider.getQuestionsAttemptsOnline(this.lessonId, retake, false, undefined, false, true);
                } else {
                    this.lessonProvider.getContentPagesViewedOnline(this.lessonId, retake, false, true);
                }
            }

            if (result.nodefaultresponse || result.inmediatejump) {
                // Don't display feedback or force a redirect to a new page. Load the new page.
                return this.jumpToPage(result.newpageid);
            } else {

                // Not inmediate jump, show the feedback.
                result.feedback = this.lessonHelper.removeQuestionFromFeedback(result.feedback);
                this.messages = result.messages;
                this.processData = result;
                this.processData.buttons = [];

                if (this.lesson.review && !result.correctanswer && !result.noanswer && !result.isessayquestion &&
                       !result.maxattemptsreached && !result.reviewmode) {
                    // User can try again, show button to do so.
                    this.processData.buttons.push({
                        label: 'addon.mod_lesson.reviewquestionback',
                        pageId: this.currentPage
                    });
                }

                // Button to continue.
                if (this.lesson.review && !result.correctanswer && !result.noanswer && !result.isessayquestion &&
                       !result.maxattemptsreached) {
                    /* If both the "Yes, I'd like to try again" and "No, I just want to go on to the next question" point to the
                       same page then don't show the "No, I just want to go on to the next question" button. It's confusing. */
                    if (this.pageData.page.id != result.newpageid) {
                        // Button to continue the lesson (the page to go is configured by the teacher).
                        this.processData.buttons.push({
                            label: 'addon.mod_lesson.reviewquestioncontinue',
                            pageId: result.newpageid
                        });
                    }
                } else {
                    this.processData.buttons.push({
                        label: 'addon.mod_lesson.continue',
                        pageId: result.newpageid
                    });
                }
            }
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error processing page');
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Review the lesson.
     *
     * @param {number} pageId Page to load.
     */
    reviewLesson(pageId: number): void {
        this.loaded = false;
        this.review = true;
        this.offline = false; // Don't allow offline mode in review.

        this.loadPage(pageId).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error loading page');
        }).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Submit a question.
     *
     * @param {Event} e Event.
     */
    submitQuestion(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        this.loaded = false;

        // Use getRawValue to include disabled values.
        const data = this.lessonHelper.prepareQuestionData(this.question, this.questionForm.getRawValue());

        this.processPage(data).finally(() => {
            this.loaded = true;
        });
    }

    /**
     * Time up.
     */
    timeUp(): void {
        // Time up called, hide the timer.
        this.endTime = undefined;
        this.loaded = false;

        this.finishRetake(true).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error finishing attempt');
        }).finally(() => {
            this.loaded = true;
        });
    }
}
