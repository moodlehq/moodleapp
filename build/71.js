webpackJsonp([71],{

/***/ 1827:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AddonModLessonPlayerPageModule", function() { return AddonModLessonPlayerPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__player__ = __webpack_require__(1948);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};






var AddonModLessonPlayerPageModule = /** @class */ (function () {
    function AddonModLessonPlayerPageModule() {
    }
    AddonModLessonPlayerPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_5__player__["a" /* AddonModLessonPlayerPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_3__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_4__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_5__player__["a" /* AddonModLessonPlayerPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], AddonModLessonPlayerPageModule);
    return AddonModLessonPlayerPageModule;
}());

//# sourceMappingURL=player.module.js.map

/***/ }),

/***/ 1948:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return AddonModLessonPlayerPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__angular_forms__ = __webpack_require__(20);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_logger__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_sync__ = __webpack_require__(45);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__providers_utils_time__ = __webpack_require__(22);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__providers_utils_url__ = __webpack_require__(47);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__providers_utils_utils__ = __webpack_require__(5);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_13__providers_lesson__ = __webpack_require__(97);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_14__providers_lesson_offline__ = __webpack_require__(200);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_15__providers_lesson_sync__ = __webpack_require__(257);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_16__providers_helper__ = __webpack_require__(935);
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};

















/**
 * Page that allows attempting and reviewing a lesson.
 */
var AddonModLessonPlayerPage = /** @class */ (function () {
    function AddonModLessonPlayerPage(navParams, logger, translate, eventsProvider, sitesProvider, syncProvider, domUtils, popoverCtrl, timeUtils, lessonProvider, lessonHelper, lessonSync, lessonOfflineProvider, cdr, modalCtrl, navCtrl, appProvider, utils, urlUtils, fb) {
        this.navParams = navParams;
        this.translate = translate;
        this.eventsProvider = eventsProvider;
        this.sitesProvider = sitesProvider;
        this.syncProvider = syncProvider;
        this.domUtils = domUtils;
        this.timeUtils = timeUtils;
        this.lessonProvider = lessonProvider;
        this.lessonHelper = lessonHelper;
        this.lessonSync = lessonSync;
        this.lessonOfflineProvider = lessonOfflineProvider;
        this.cdr = cdr;
        this.navCtrl = navCtrl;
        this.appProvider = appProvider;
        this.utils = utils;
        this.urlUtils = urlUtils;
        this.fb = fb;
        this.component = __WEBPACK_IMPORTED_MODULE_13__providers_lesson__["a" /* AddonModLessonProvider */].COMPONENT;
        this.LESSON_EOL = __WEBPACK_IMPORTED_MODULE_13__providers_lesson__["a" /* AddonModLessonProvider */].LESSON_EOL;
        this.forceLeave = false; // If true, don't perform any check when leaving the view.
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
    AddonModLessonPlayerPage.prototype.ngOnInit = function () {
        var _this = this;
        // Fetch the Lesson data.
        this.fetchLessonData().then(function (success) {
            if (success) {
                // Review data loaded or new retake started, remove any retake being finished in sync.
                _this.lessonSync.deleteRetakeFinishedInSync(_this.lessonId);
            }
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Component being destroyed.
     */
    AddonModLessonPlayerPage.prototype.ngOnDestroy = function () {
        // Unblock the lesson so it can be synced.
        this.syncProvider.unblockOperation(this.component, this.lessonId);
    };
    /**
     * Check if we can leave the page or not.
     *
     * @return {boolean|Promise<void>} Resolved if we can leave it, rejected if not.
     */
    AddonModLessonPlayerPage.prototype.ionViewCanLeave = function () {
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
    };
    /**
     * A button was clicked.
     *
     * @param {any} data Button data.
     */
    AddonModLessonPlayerPage.prototype.buttonClicked = function (data) {
        this.processPage(data);
    };
    /**
     * Call a function and go offline if allowed and the call fails.
     *
     * @param {Function} func Function to call.
     * @param {any[]} args Arguments to pass to the function.
     * @param {number} offlineParamPos Position of the offline parameter in the args.
     * @param {number} [jumpsParamPos] Position of the jumps parameter in the args.
     * @return {Promise<any>} Promise resolved in success, rejected otherwise.
     */
    AddonModLessonPlayerPage.prototype.callFunction = function (func, args, offlineParamPos, jumpsParamPos) {
        var _this = this;
        return func.apply(func, args).catch(function (error) {
            if (!_this.offline && !_this.review && _this.lessonProvider.isLessonOffline(_this.lesson) &&
                !_this.utils.isWebServiceError(error)) {
                // If it fails, go offline.
                _this.offline = true;
                // Get the possible jumps now.
                return _this.lessonProvider.getPagesPossibleJumps(_this.lesson.id, true).then(function (jumpList) {
                    _this.jumps = jumpList;
                    // Call the function again with offline set to true and the new jumps.
                    args[offlineParamPos] = true;
                    if (typeof jumpsParamPos != 'undefined') {
                        args[jumpsParamPos] = _this.jumps;
                    }
                    return func.apply(func, args);
                });
            }
            return Promise.reject(error);
        });
    };
    /**
     * Change the page from menu or when continuing from a feedback page.
     *
     * @param {number} pageId Page to load.
     * @param {boolean} [ignoreCurrent] If true, allow loading current page.
     */
    AddonModLessonPlayerPage.prototype.changePage = function (pageId, ignoreCurrent) {
        var _this = this;
        if (!ignoreCurrent && !this.eolData && this.currentPage == pageId) {
            // Page already loaded, stop.
            return;
        }
        this.loaded = true;
        this.messages = [];
        this.loadPage(pageId).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error loading page');
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Get the lesson data and load the page.
     *
     * @return {Promise<boolean>} Promise resolved with true if success, resolved with false otherwise.
     */
    AddonModLessonPlayerPage.prototype.fetchLessonData = function () {
        var _this = this;
        // Wait for any ongoing sync to finish. We won't sync a lesson while it's being played.
        return this.lessonSync.waitForSync(this.lessonId).then(function () {
            return _this.lessonProvider.getLessonById(_this.courseId, _this.lessonId);
        }).then(function (lessonData) {
            _this.lesson = lessonData;
            _this.title = _this.lesson.name; // Temporary title.
            // If lesson has offline data already, use offline mode.
            return _this.lessonOfflineProvider.hasOfflineData(_this.lessonId);
        }).then(function (offlineMode) {
            _this.offline = offlineMode;
            if (!offlineMode && !_this.appProvider.isOnline() && _this.lessonProvider.isLessonOffline(_this.lesson) && !_this.review) {
                // Lesson doesn't have offline data, but it allows offline and the device is offline. Use offline mode.
                _this.offline = true;
            }
            return _this.callFunction(_this.lessonProvider.getAccessInformation.bind(_this.lessonProvider), [_this.lesson.id, _this.offline, true], 1);
        }).then(function (info) {
            var promises = [];
            _this.accessInfo = info;
            _this.canManage = info.canmanage;
            _this.retake = info.attemptscount;
            _this.showRetake = !_this.currentPage && _this.retake > 0; // Only show it in first page if it isn't the first retake.
            if (info.preventaccessreasons && info.preventaccessreasons.length) {
                // If it's a password protected lesson and we have the password, allow playing it.
                if (!_this.password || info.preventaccessreasons.length > 1 || !_this.lessonProvider.isPasswordProtected(info)) {
                    // Lesson cannot be played, show message and go back.
                    return Promise.reject(info.preventaccessreasons[0].message);
                }
            }
            if (_this.review && _this.navParams.get('retake') != info.attemptscount - 1) {
                // Reviewing a retake that isn't the last one. Error.
                return Promise.reject(_this.translate.instant('addon.mod_lesson.errorreviewretakenotlast'));
            }
            if (_this.password) {
                // Lesson uses password, get the whole lesson object.
                promises.push(_this.callFunction(_this.lessonProvider.getLessonWithPassword.bind(_this.lessonProvider), [_this.lesson.id, _this.password, true, _this.offline, true], 3).then(function (lesson) {
                    _this.lesson = lesson;
                }));
            }
            if (_this.offline) {
                // Offline mode, get the list of possible jumps to allow navigation.
                promises.push(_this.lessonProvider.getPagesPossibleJumps(_this.lesson.id, true).then(function (jumpList) {
                    _this.jumps = jumpList;
                }));
            }
            return Promise.all(promises);
        }).then(function () {
            _this.mediaFile = _this.lesson.mediafiles && _this.lesson.mediafiles[0];
            _this.lessonWidth = _this.lesson.slideshow ? _this.domUtils.formatPixelsSize(_this.lesson.mediawidth) : '';
            _this.lessonHeight = _this.lesson.slideshow ? _this.domUtils.formatPixelsSize(_this.lesson.mediaheight) : '';
            return _this.launchRetake(_this.currentPage);
        }).then(function () {
            return true;
        }).catch(function (error) {
            // An error occurred.
            var promise;
            if (_this.review && _this.navParams.get('retake') && _this.utils.isWebServiceError(error)) {
                // The user cannot review the retake. Unmark the retake as being finished in sync.
                promise = _this.lessonSync.deleteRetakeFinishedInSync(_this.lessonId);
            }
            else {
                promise = Promise.resolve();
            }
            return promise.then(function () {
                _this.domUtils.showErrorModalDefault(error, 'core.course.errorgetmodule', true);
                _this.forceLeave = true;
                _this.navCtrl.pop();
                return false;
            });
        });
    };
    /**
     * Finish the retake.
     *
     * @param {boolean} [outOfTime] Whether the retake is finished because the user ran out of time.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonPlayerPage.prototype.finishRetake = function (outOfTime) {
        var _this = this;
        var promise;
        this.messages = [];
        if (this.offline && this.appProvider.isOnline()) {
            // Offline mode but the app is online. Try to sync the data.
            promise = this.lessonSync.syncLesson(this.lesson.id, true, true).then(function (result) {
                if (result.warnings && result.warnings.length) {
                    var error_1 = result.warnings[0];
                    // Some data was deleted. Check if the retake has changed.
                    return _this.lessonProvider.getAccessInformation(_this.lesson.id).then(function (info) {
                        if (info.attemptscount != _this.accessInfo.attemptscount) {
                            // The retake has changed. Leave the view and show the error.
                            _this.forceLeave = true;
                            _this.navCtrl.pop();
                            return Promise.reject(error_1);
                        }
                        // Retake hasn't changed, show the warning and finish the retake in offline.
                        _this.offline = false;
                        _this.domUtils.showErrorModal(error_1);
                    });
                }
                _this.offline = false;
            }, function () {
                // Ignore errors.
            });
        }
        else {
            promise = Promise.resolve();
        }
        return promise.then(function () {
            // Now finish the retake.
            var args = [_this.lesson, _this.courseId, _this.password, outOfTime, _this.review, _this.offline, _this.accessInfo];
            return _this.callFunction(_this.lessonProvider.finishRetake.bind(_this.lessonProvider), args, 5);
        }).then(function (data) {
            _this.title = _this.lesson.name;
            _this.eolData = data.data;
            _this.messages = _this.messages.concat(data.messages);
            _this.processData = undefined;
            // Format activity link if present.
            if (_this.eolData && _this.eolData.activitylink) {
                _this.eolData.activitylink.value = _this.lessonHelper.formatActivityLink(_this.eolData.activitylink.value);
            }
            // Format review lesson if present.
            if (_this.eolData && _this.eolData.reviewlesson) {
                var params = _this.urlUtils.extractUrlParams(_this.eolData.reviewlesson.value);
                if (!params || !params.pageid) {
                    // No pageid in the URL, the user cannot review (probably didn't answer any question).
                    delete _this.eolData.reviewlesson;
                }
                else {
                    _this.eolData.reviewlesson.pageid = params.pageid;
                }
            }
        });
    };
    /**
     * Jump to a certain page after performing an action.
     *
     * @param {number} pageId The page to load.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonPlayerPage.prototype.jumpToPage = function (pageId) {
        if (pageId === 0) {
            // Not a valid page, return to entry view.
            // This happens, for example, when the user clicks to go to previous page and there is no previous page.
            this.forceLeave = true;
            this.navCtrl.pop();
            return Promise.resolve();
        }
        else if (pageId == __WEBPACK_IMPORTED_MODULE_13__providers_lesson__["a" /* AddonModLessonProvider */].LESSON_EOL) {
            // End of lesson reached.
            return this.finishRetake();
        }
        // Load new page.
        this.messages = [];
        return this.loadPage(pageId);
    };
    /**
     * Start or continue a retake.
     *
     * @param {number} pageId The page to load.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonPlayerPage.prototype.launchRetake = function (pageId) {
        var _this = this;
        var promise;
        if (this.review) {
            // Review mode, no need to launch the retake.
            promise = Promise.resolve({});
        }
        else if (!this.offline) {
            // Not in offline mode, launch the retake.
            promise = this.lessonProvider.launchRetake(this.lesson.id, this.password, pageId);
        }
        else {
            // Check if there is a finished offline retake.
            promise = this.lessonOfflineProvider.hasFinishedRetake(this.lesson.id).then(function (finished) {
                if (finished) {
                    // Always show EOL page.
                    pageId = __WEBPACK_IMPORTED_MODULE_13__providers_lesson__["a" /* AddonModLessonProvider */].LESSON_EOL;
                }
                return {};
            });
        }
        return promise.then(function (data) {
            _this.currentPage = pageId || _this.accessInfo.firstpageid;
            _this.messages = data.messages || [];
            if (_this.lesson.timelimit && !_this.accessInfo.canmanage) {
                // Get the last lesson timer.
                return _this.lessonProvider.getTimers(_this.lesson.id, false, true).then(function (timers) {
                    _this.endTime = timers[timers.length - 1].starttime + _this.lesson.timelimit;
                });
            }
        }).then(function () {
            return _this.loadPage(_this.currentPage);
        });
    };
    /**
     * Load the lesson menu.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonPlayerPage.prototype.loadMenu = function () {
        var _this = this;
        if (this.loadingMenu) {
            // Already loading.
            return;
        }
        this.loadingMenu = true;
        var args = [this.lessonId, this.password, this.offline, true];
        return this.callFunction(this.lessonProvider.getPages.bind(this.lessonProvider), args, 2).then(function (pages) {
            _this.lessonPages = pages.map(function (entry) {
                return entry.page;
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error loading menu.');
        }).finally(function () {
            _this.loadingMenu = false;
        });
    };
    /**
     * Load a certain page.
     *
     * @param {number} pageId The page to load.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonPlayerPage.prototype.loadPage = function (pageId) {
        var _this = this;
        if (pageId == __WEBPACK_IMPORTED_MODULE_13__providers_lesson__["a" /* AddonModLessonProvider */].LESSON_EOL) {
            // End of lesson reached.
            return this.finishRetake();
        }
        var args = [this.lesson, pageId, this.password, this.review, true, this.offline, true, this.accessInfo, this.jumps];
        return this.callFunction(this.lessonProvider.getPageData.bind(this.lessonProvider), args, 5, 8).then(function (data) {
            if (data.newpageid == __WEBPACK_IMPORTED_MODULE_13__providers_lesson__["a" /* AddonModLessonProvider */].LESSON_EOL) {
                // End of lesson reached.
                return _this.finishRetake();
            }
            _this.pageData = data;
            _this.title = data.page.title;
            _this.pageContent = _this.lessonHelper.getPageContentsFromPageData(data);
            _this.loaded = true;
            _this.currentPage = pageId;
            _this.messages = _this.messages.concat(data.messages);
            // Page loaded, hide EOL and feedback data if shown.
            _this.eolData = _this.processData = undefined;
            if (_this.lessonProvider.isQuestionPage(data.page.type)) {
                // Create an empty FormGroup without controls, they will be added in getQuestionFromPageData.
                _this.questionForm = _this.fb.group({});
                _this.pageButtons = [];
                _this.question = _this.lessonHelper.getQuestionFromPageData(_this.questionForm, data);
                _this.originalData = _this.questionForm.getRawValue(); // Use getRawValue to include disabled values.
            }
            else {
                _this.pageButtons = _this.lessonHelper.getPageButtonsFromHtml(data.pagecontent);
                _this.question = undefined;
                _this.originalData = undefined;
            }
            if (data.displaymenu && !_this.displayMenu) {
                // Load the menu.
                _this.loadMenu();
            }
            _this.displayMenu = !!data.displaymenu;
            if (!_this.firstPageLoaded) {
                _this.firstPageLoaded = true;
            }
            else {
                _this.showRetake = false;
            }
        });
    };
    /**
     * Process a page, sending some data.
     *
     * @param {any} data The data to send.
     * @return {Promise<any>} Promise resolved when done.
     */
    AddonModLessonPlayerPage.prototype.processPage = function (data) {
        var _this = this;
        this.loaded = false;
        var args = [this.lesson, this.courseId, this.pageData, data, this.password, this.review, this.offline, this.accessInfo,
            this.jumps];
        return this.callFunction(this.lessonProvider.processPage.bind(this.lessonProvider), args, 6, 8).then(function (result) {
            if (!_this.offline && !_this.review && _this.lessonProvider.isLessonOffline(_this.lesson)) {
                // Lesson allows offline and the user changed some data in server. Update cached data.
                var retake = _this.accessInfo.attemptscount;
                if (_this.lessonProvider.isQuestionPage(_this.pageData.page.type)) {
                    _this.lessonProvider.getQuestionsAttemptsOnline(_this.lessonId, retake, false, undefined, false, true);
                }
                else {
                    _this.lessonProvider.getContentPagesViewedOnline(_this.lessonId, retake, false, true);
                }
            }
            if (result.nodefaultresponse || result.inmediatejump) {
                // Don't display feedback or force a redirect to a new page. Load the new page.
                return _this.jumpToPage(result.newpageid);
            }
            else {
                // Not inmediate jump, show the feedback.
                result.feedback = _this.lessonHelper.removeQuestionFromFeedback(result.feedback);
                _this.messages = result.messages;
                _this.processData = result;
                _this.processData.buttons = [];
                if (_this.lesson.review && !result.correctanswer && !result.noanswer && !result.isessayquestion &&
                    !result.maxattemptsreached && !result.reviewmode) {
                    // User can try again, show button to do so.
                    _this.processData.buttons.push({
                        label: 'addon.mod_lesson.reviewquestionback',
                        pageId: _this.currentPage
                    });
                }
                // Button to continue.
                if (_this.lesson.review && !result.correctanswer && !result.noanswer && !result.isessayquestion &&
                    !result.maxattemptsreached) {
                    _this.processData.buttons.push({
                        label: 'addon.mod_lesson.reviewquestioncontinue',
                        pageId: result.newpageid
                    });
                }
                else {
                    _this.processData.buttons.push({
                        label: 'addon.mod_lesson.continue',
                        pageId: result.newpageid
                    });
                }
            }
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error processing page');
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Review the lesson.
     *
     * @param {number} pageId Page to load.
     */
    AddonModLessonPlayerPage.prototype.reviewLesson = function (pageId) {
        var _this = this;
        this.loaded = false;
        this.review = true;
        this.offline = false; // Don't allow offline mode in review.
        this.loadPage(pageId).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error loading page');
        }).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Submit a question.
     */
    AddonModLessonPlayerPage.prototype.submitQuestion = function () {
        var _this = this;
        this.loaded = false;
        // Use getRawValue to include disabled values.
        var data = this.lessonHelper.prepareQuestionData(this.question, this.questionForm.getRawValue());
        this.processPage(data).finally(function () {
            _this.loaded = true;
        });
    };
    /**
     * Time up.
     */
    AddonModLessonPlayerPage.prototype.timeUp = function () {
        var _this = this;
        // Time up called, hide the timer.
        this.endTime = undefined;
        this.loaded = false;
        this.finishRetake(true).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error finishing attempt');
        }).finally(function () {
            _this.loaded = true;
        });
    };
    __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["_9" /* ViewChild */])(__WEBPACK_IMPORTED_MODULE_2_ionic_angular__["f" /* Content */]),
        __metadata("design:type", __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["f" /* Content */])
    ], AddonModLessonPlayerPage.prototype, "content", void 0);
    AddonModLessonPlayerPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-addon-mod-lesson-player',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/addon/mod/lesson/pages/player/player.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="title"></core-format-text></ion-title>\n\n        <ion-buttons end>\n            <button *ngIf="displayMenu || mediaFile" ion-button icon-only [attr.aria-label]="\'addon.mod_lesson.lessonmenu\' | translate" (click)="menuModal.present()">\n                <ion-icon name="bookmark"></ion-icon>\n            </button>\n        </ion-buttons>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <core-loading [hideUntil]="loaded">\n        <!-- Info messages. Only show the first one. -->\n        <div class="core-info-card" icon-start *ngIf="lesson && messages && messages.length">\n            <ion-icon name="information-circle"></ion-icon>\n            <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="messages[0].message"></core-format-text>\n        </div>\n\n        <div *ngIf="lesson" [ngClass]=\'{"addon-mod_lesson-slideshow": lesson.slideshow}\' [ngStyle]="{\'width\': lessonWidth, \'height\': lessonHeight}">\n\n            <core-timer *ngIf="endTime" [endTime]="endTime" (finished)="timeUp()" [timerText]="\'addon.mod_lesson.timeremaining\' | translate"></core-timer>\n\n            <!-- Retake and ongoing score. -->\n            <ion-item text-wrap *ngIf="showRetake && !eolData && !processData">\n                <p>{{ \'addon.mod_lesson.attempt\' | translate:{$a: retake} }}</p>\n            </ion-item>\n            <ion-item text-wrap *ngIf="pageData && pageData.ongoingscore && !eolData && !processData" class="addon-mod_lesson-ongoingscore">\n                <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="pageData.ongoingscore"></core-format-text>\n            </ion-item>\n\n            <!-- Page content. -->\n            <ion-card *ngIf="!eolData && !processData">\n                <!-- Content page. -->\n                <ion-item text-wrap *ngIf="!question">\n                    <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="pageContent"></core-format-text>\n                </ion-item>\n\n                <!-- Question page. -->\n                <!-- We need to set ngIf loaded to make formGroup directive restart every time a page changes, see MOBILE-2540. -->\n                <form *ngIf="question && loaded" ion-list [formGroup]="questionForm">\n                    <ion-item-divider text-wrap color="light">\n                        <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="pageContent"></core-format-text>\n                    </ion-item-divider>\n\n                    <input *ngFor="let input of question.hiddenInputs" type="hidden" [name]="input.name" [value]="input.value" />\n\n                    <!-- Render a different input depending on the type of the question. -->\n                    <ng-container [ngSwitch]="question.template">\n\n                        <!-- Short answer. -->\n                        <ng-container *ngSwitchCase="\'shortanswer\'">\n                            <ion-input padding-left [type]="question.input.type" placeholder="{{ \'addon.mod_lesson.youranswer\' | translate }}" [id]="question.input.id" [formControlName]="question.input.name" autocorrect="off" [maxlength]="question.input.maxlength">\n                            </ion-input>\n                        </ng-container>\n\n                        <!-- Essay. -->\n                        <ng-container *ngSwitchCase="\'essay\'">\n                            <ion-item *ngIf="question.textarea">\n                                <core-rich-text-editor item-content placeholder="{{ \'addon.mod_lesson.youranswer\' | translate }}" [control]="question.control" [component]="component" [componentId]="lesson.coursemodule"></core-rich-text-editor>\n                            </ion-item>\n                            <ion-item text-wrap *ngIf="!question.textarea && question.useranswer">\n                                <p class="item-heading">{{ \'addon.mod_lesson.youranswer\' | translate }}</p>\n                                <p><core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="question.useranswer"></core-format-text></p>\n                            </ion-item>\n                        </ng-container>\n\n                        <!-- Multichoice. -->\n                        <ng-container *ngSwitchCase="\'multichoice\'">\n                            <!-- Single choice. -->\n                            <div *ngIf="!question.multi" radio-group [formControlName]="question.controlName">\n                                <ion-item text-wrap *ngFor="let option of question.options">\n                                    <ion-label>\n                                        <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="option.text"></core-format-text>\n                                    </ion-label>\n                                    <ion-radio [id]="option.id" [value]="option.value" [disabled]="option.disabled"></ion-radio>\n                                </ion-item>\n                            </div>\n\n                            <!-- Multiple choice. -->\n                            <ng-container *ngIf="question.multi">\n                                <ion-item text-wrap *ngFor="let option of question.options">\n                                    <ion-label>\n                                        <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="option.text"></core-format-text>\n                                    </ion-label>\n                                    <ion-checkbox [id]="option.id" [formControlName]="option.name" item-end></ion-checkbox>\n                                </ion-item>\n                            </ng-container>\n                        </ng-container>\n\n                        <!-- Matching. -->\n                        <ng-container *ngSwitchCase="\'matching\'">\n                            <ion-item text-wrap *ngFor="let row of question.rows">\n                                <ion-grid item-content>\n                                    <ion-row>\n                                        <ion-col>\n                                            <p><core-format-text id="addon-mod_lesson-matching-{{row.id}}" [component]="component" [componentId]="lesson.coursemodule" [text]="row.text"></core-format-text></p>\n                                        </ion-col>\n                                        <ion-col>\n                                            <ion-select [id]="row.id" [formControlName]="row.name" [attr.aria-labelledby]="\'addon-mod_lesson-matching-\' + row.id" interface="popover">\n                                                <ion-option *ngFor="let option of row.options" [value]="option.value">{{option.label}}</ion-option>\n                                            </ion-select>\n                                        </ion-col>\n                                    </ion-row>\n                                </ion-grid>\n                            </ion-item>\n                        </ng-container>\n                    </ng-container>\n\n                    <ion-item>\n                        <button ion-button block (click)="submitQuestion()" class="button-no-uppercase">{{ question.submitLabel }}</button>\n                    </ion-item>\n                </form>\n            </ion-card>\n\n            <!-- Page buttons and progress. -->\n            <ion-list *ngIf="!eolData && !processData">\n                <ion-grid text-wrap *ngIf="pageButtons && pageButtons.length" class="addon-mod_lesson-pagebuttons">\n                    <ion-row align-items-center>\n                        <ion-col *ngFor="let button of pageButtons" col-12 col-md-6 col-lg-3 col-xl>\n                            <a ion-button block outline text-wrap [id]="button.id" (click)="buttonClicked(button.data)" class="button-no-uppercase">{{ button.content }}</a>\n                        </ion-col>\n                    </ion-row>\n                </ion-grid>\n                <ion-item text-wrap *ngIf="lesson && lesson.progressbar && !canManage && pageData">\n                    <p>{{ \'addon.mod_lesson.progresscompleted\' | translate:{$a: pageData.progress} }}</p>\n                    <core-progress-bar [progress]="pageData.progress"></core-progress-bar>\n                </ion-item>\n                <div class="core-info-card" icon-start *ngIf="lesson && lesson.progressbar && canManage">\n                    <ion-icon name="information-circle"></ion-icon>\n                    {{ \'addon.mod_lesson.progressbarteacherwarning2\' | translate }}\n                </div>\n            </ion-list>\n\n            <!-- End of lesson reached. -->\n            <ion-card *ngIf="eolData && !processData">\n                <div class="core-warning-card" icon-start *ngIf="eolData.offline && eolData.offline.value">\n                    <ion-icon name="warning"></ion-icon>\n                    {{ \'addon.mod_lesson.finishretakeoffline\' | translate }}\n                </div>\n\n                <h3 padding *ngIf="eolData.gradelesson">{{ \'addon.mod_lesson.congratulations\' | translate }}</h3>\n                <ion-item text-wrap *ngIf="eolData.notenoughtimespent">\n                    <core-format-text [text]="eolData.notenoughtimespent.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.numberofpagesviewed">\n                    <core-format-text [text]="eolData.numberofpagesviewed.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.youshouldview">\n                    <core-format-text [text]="eolData.youshouldview.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.numberofcorrectanswers">\n                    <core-format-text [text]="eolData.numberofcorrectanswers.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.displayscorewithessays">\n                    <core-format-text [text]="eolData.displayscorewithessays.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="!eolData.displayscorewithessays && eolData.displayscorewithoutessays">\n                    <core-format-text [text]="eolData.displayscorewithoutessays.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.yourcurrentgradeisoutof">\n                    <core-format-text [text]="eolData.yourcurrentgradeisoutof.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.eolstudentoutoftimenoanswers">\n                    <core-format-text [text]="eolData.eolstudentoutoftimenoanswers.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.welldone">\n                    <core-format-text [text]="eolData.welldone.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="lesson.progressbar && eolData.progresscompleted">\n                    <p>{{ \'addon.mod_lesson.progresscompleted\' | translate:{$a: eolData.progresscompleted.value} }}</p>\n                    <core-progress-bar [progress]="eolData.progresscompleted.value"></core-progress-bar>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.displayofgrade">\n                    <core-format-text [text]="eolData.displayofgrade.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.reviewlesson">\n                    <a ion-button block (click)="reviewLesson(eolData.reviewlesson.pageid)" class="button-no-uppercase">\n                        <core-format-text [text]="\'addon.mod_lesson.reviewlesson\' | translate"></core-format-text>\n                    </a>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.modattemptsnoteacher">\n                    <core-format-text [text]="eolData.modattemptsnoteacher.message"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="eolData.activitylink && eolData.activitylink.value">\n                    <ng-container *ngIf="eolData.activitylink.value.formatted">\n                        <!-- Activity link was successfully formatted, render the button. -->\n                        <a ion-button block color="light" [href]="eolData.activitylink.value.href" core-link [capture]="true" class="button-no-uppercase">\n                            <core-format-text [text]="eolData.activitylink.value.label"></core-format-text>\n                        </a>\n                    </ng-container>\n                    <ng-container *ngIf="!eolData.activitylink.value.formatted">\n                        <!-- Activity link wasn\'t formatted, render the original link. -->\n                        <core-format-text [text]="eolData.activitylink.value.label"></core-format-text>\n                    </ng-container>\n                </ion-item>\n            </ion-card>\n\n            <!-- Feedback returned when processing an action. -->\n            <ion-list *ngIf="processData">\n                <ion-item text-wrap *ngIf="processData.ongoingscore && !processData.reviewmode" >\n                    <core-format-text class="addon-mod_lesson-ongoingscore" [text]="processData.ongoingscore"></core-format-text>\n                </ion-item>\n                <ion-item text-wrap *ngIf="!processData.reviewmode || review">\n                    <p *ngIf="!processData.reviewmode">\n                        <core-format-text [component]="component" [componentId]="lesson.coursemodule" [text]="processData.feedback"></core-format-text>\n                    </p>\n                    <div *ngIf="review">\n                        <p>{{ \'addon.mod_lesson.gotoendoflesson\' | translate }}</p>\n                        <p>{{ \'addon.mod_lesson.or\' | translate }}</p>\n                        <p>{{ \'addon.mod_lesson.continuetonextpage\' | translate }}</p>\n                    </div>\n                </ion-item>\n                <ion-item text-wrap *ngIf="review || (processData.buttons && processData.buttons.length)">\n                    <a ion-button block color="light" *ngIf="review" (click)="changePage(LESSON_EOL)">{{ \'addon.mod_lesson.finish\' | translate }}</a>\n                    <a ion-button block color="light" *ngFor="let button of processData.buttons" (click)="changePage(button.pageId, true)">{{ button.label | translate }}</a>\n                </ion-item>\n            </ion-list>\n        </div>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/addon/mod/lesson/pages/player/player.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_2_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_6__providers_logger__["a" /* CoreLoggerProvider */], __WEBPACK_IMPORTED_MODULE_3__ngx_translate_core__["c" /* TranslateService */],
            __WEBPACK_IMPORTED_MODULE_5__providers_events__["a" /* CoreEventsProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_8__providers_sync__["a" /* CoreSyncProvider */], __WEBPACK_IMPORTED_MODULE_9__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["v" /* PopoverController */],
            __WEBPACK_IMPORTED_MODULE_10__providers_utils_time__["a" /* CoreTimeUtilsProvider */], __WEBPACK_IMPORTED_MODULE_13__providers_lesson__["a" /* AddonModLessonProvider */],
            __WEBPACK_IMPORTED_MODULE_16__providers_helper__["a" /* AddonModLessonHelperProvider */], __WEBPACK_IMPORTED_MODULE_15__providers_lesson_sync__["a" /* AddonModLessonSyncProvider */],
            __WEBPACK_IMPORTED_MODULE_14__providers_lesson_offline__["a" /* AddonModLessonOfflineProvider */], __WEBPACK_IMPORTED_MODULE_0__angular_core__["j" /* ChangeDetectorRef */],
            __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["p" /* ModalController */], __WEBPACK_IMPORTED_MODULE_2_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_4__providers_app__["a" /* CoreAppProvider */],
            __WEBPACK_IMPORTED_MODULE_12__providers_utils_utils__["a" /* CoreUtilsProvider */], __WEBPACK_IMPORTED_MODULE_11__providers_utils_url__["a" /* CoreUrlUtilsProvider */], __WEBPACK_IMPORTED_MODULE_1__angular_forms__["a" /* FormBuilder */]])
    ], AddonModLessonPlayerPage);
    return AddonModLessonPlayerPage;
}());

//# sourceMappingURL=player.js.map

/***/ })

});
//# sourceMappingURL=71.js.map