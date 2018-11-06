webpackJsonp([43],{

/***/ 1861:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CoreCoursesCoursePreviewPageModule", function() { return CoreCoursesCoursePreviewPageModule; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__course_preview__ = __webpack_require__(1986);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__components_components_module__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__ = __webpack_require__(14);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__pipes_pipes_module__ = __webpack_require__(67);
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







var CoreCoursesCoursePreviewPageModule = /** @class */ (function () {
    function CoreCoursesCoursePreviewPageModule() {
    }
    CoreCoursesCoursePreviewPageModule = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["I" /* NgModule */])({
            declarations: [
                __WEBPACK_IMPORTED_MODULE_3__course_preview__["a" /* CoreCoursesCoursePreviewPage */],
            ],
            imports: [
                __WEBPACK_IMPORTED_MODULE_4__components_components_module__["a" /* CoreComponentsModule */],
                __WEBPACK_IMPORTED_MODULE_5__directives_directives_module__["a" /* CoreDirectivesModule */],
                __WEBPACK_IMPORTED_MODULE_6__pipes_pipes_module__["a" /* CorePipesModule */],
                __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["l" /* IonicPageModule */].forChild(__WEBPACK_IMPORTED_MODULE_3__course_preview__["a" /* CoreCoursesCoursePreviewPage */]),
                __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["b" /* TranslateModule */].forChild()
            ],
        })
    ], CoreCoursesCoursePreviewPageModule);
    return CoreCoursesCoursePreviewPageModule;
}());

//# sourceMappingURL=course-preview.module.js.map

/***/ }),

/***/ 1986:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return CoreCoursesCoursePreviewPage; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__angular_core__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_ionic_angular__ = __webpack_require__(4);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__providers_app__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__providers_events__ = __webpack_require__(12);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__providers_sites__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_7__providers_utils_text__ = __webpack_require__(11);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_8__providers_courses__ = __webpack_require__(40);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_9__core_course_providers_options_delegate__ = __webpack_require__(107);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_10__core_course_providers_course__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_11__core_course_providers_helper__ = __webpack_require__(21);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_12__core_course_providers_format_delegate__ = __webpack_require__(98);
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
 * Page that allows "previewing" a course and enrolling in it if enabled and not enrolled.
 */
var CoreCoursesCoursePreviewPage = /** @class */ (function () {
    function CoreCoursesCoursePreviewPage(navCtrl, navParams, sitesProvider, domUtils, textUtils, appProvider, coursesProvider, platform, modalCtrl, translate, eventsProvider, courseOptionsDelegate, courseHelper, courseProvider, courseFormatDelegate, zone) {
        var _this = this;
        this.navCtrl = navCtrl;
        this.sitesProvider = sitesProvider;
        this.domUtils = domUtils;
        this.textUtils = textUtils;
        this.coursesProvider = coursesProvider;
        this.platform = platform;
        this.modalCtrl = modalCtrl;
        this.translate = translate;
        this.eventsProvider = eventsProvider;
        this.courseOptionsDelegate = courseOptionsDelegate;
        this.courseHelper = courseHelper;
        this.courseProvider = courseProvider;
        this.courseFormatDelegate = courseFormatDelegate;
        this.zone = zone;
        this.canAccessCourse = true;
        this.component = 'CoreCoursesCoursePreview';
        this.selfEnrolInstances = [];
        this.avoidOpenCourse = false;
        this.prefetchCourseData = {
            prefetchCourseIcon: 'spinner',
            title: 'core.course.downloadcourse'
        };
        this.isGuestEnabled = false;
        this.waitStart = 0;
        this.pageDestroyed = false;
        this.course = navParams.get('course');
        this.avoidOpenCourse = navParams.get('avoidOpenCourse');
        this.isMobile = appProvider.isMobile();
        this.isDesktop = appProvider.isDesktop();
        this.downloadCourseEnabled = !this.coursesProvider.isDownloadCourseDisabledInSite();
        if (this.downloadCourseEnabled) {
            // Listen for status change in course.
            this.courseStatusObserver = this.eventsProvider.on(__WEBPACK_IMPORTED_MODULE_4__providers_events__["a" /* CoreEventsProvider */].COURSE_STATUS_CHANGED, function (data) {
                if (data.courseId == _this.course.id) {
                    _this.updateCourseStatus(data.status);
                }
            }, this.sitesProvider.getCurrentSiteId());
        }
    }
    /**
     * View loaded.
     */
    CoreCoursesCoursePreviewPage.prototype.ionViewDidLoad = function () {
        var _this = this;
        var currentSite = this.sitesProvider.getCurrentSite(), currentSiteUrl = currentSite && currentSite.getURL();
        this.paypalEnabled = this.course.enrollmentmethods && this.course.enrollmentmethods.indexOf('paypal') > -1;
        this.guestWSAvailable = this.coursesProvider.isGuestWSAvailable();
        this.enrolUrl = this.textUtils.concatenatePaths(currentSiteUrl, 'enrol/index.php?id=' + this.course.id);
        this.courseUrl = this.textUtils.concatenatePaths(currentSiteUrl, 'course/view.php?id=' + this.course.id);
        this.paypalReturnUrl = this.textUtils.concatenatePaths(currentSiteUrl, 'enrol/paypal/return.php');
        if (this.course.overviewfiles && this.course.overviewfiles.length > 0) {
            this.course.imageThumb = this.course.overviewfiles[0].fileurl;
        }
        // Initialize the self enrol modal.
        this.selfEnrolModal = this.modalCtrl.create('CoreCoursesSelfEnrolPasswordPage');
        this.selfEnrolModal.onDidDismiss(function (password) {
            if (typeof password != 'undefined') {
                _this.selfEnrolInCourse(password, _this.currentInstanceId);
            }
        });
        this.getCourse().finally(function () {
            if (!_this.downloadCourseEnabled) {
                // Cannot download the whole course, stop.
                return;
            }
            // Determine course prefetch icon.
            _this.courseHelper.getCourseStatusIconAndTitle(_this.course.id).then(function (data) {
                _this.prefetchCourseData.prefetchCourseIcon = data.icon;
                _this.prefetchCourseData.title = data.title;
                if (data.icon == 'spinner') {
                    // Course is being downloaded. Get the download promise.
                    var promise = _this.courseHelper.getCourseDownloadPromise(_this.course.id);
                    if (promise) {
                        // There is a download promise. If it fails, show an error.
                        promise.catch(function (error) {
                            if (!_this.pageDestroyed) {
                                _this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
                            }
                        });
                    }
                    else {
                        // No download, this probably means that the app was closed while downloading. Set previous status.
                        _this.courseProvider.setCoursePreviousStatus(_this.course.id);
                    }
                }
            });
        });
    };
    /**
     * Page destroyed.
     */
    CoreCoursesCoursePreviewPage.prototype.ngOnDestroy = function () {
        this.pageDestroyed = true;
        if (this.courseStatusObserver) {
            this.courseStatusObserver.off();
        }
    };
    /**
     * Check if the user can access as guest.
     *
     * @return {Promise<boolean>} Promise resolved if can access as guest, rejected otherwise. Resolve param indicates if
     *                            password is required for guest access.
     */
    CoreCoursesCoursePreviewPage.prototype.canAccessAsGuest = function () {
        if (!this.isGuestEnabled) {
            return Promise.reject(null);
        }
        // Search instance ID of guest enrolment method.
        this.guestInstanceId = undefined;
        for (var i = 0; i < this.enrollmentMethods.length; i++) {
            var method = this.enrollmentMethods[i];
            if (method.type == 'guest') {
                this.guestInstanceId = method.id;
                break;
            }
        }
        if (this.guestInstanceId) {
            return this.coursesProvider.getCourseGuestEnrolmentInfo(this.guestInstanceId).then(function (info) {
                if (!info.status) {
                    // Not active, reject.
                    return Promise.reject(null);
                }
                return info.passwordrequired;
            });
        }
        return Promise.reject(null);
    };
    /**
     * Convenience function to get course. We use this to determine if a user can see the course or not.
     *
     * @param {boolean} refresh Whether the user is refreshing the data.
     */
    CoreCoursesCoursePreviewPage.prototype.getCourse = function (refresh) {
        var _this = this;
        // Get course enrolment methods.
        this.selfEnrolInstances = [];
        return this.coursesProvider.getCourseEnrolmentMethods(this.course.id).then(function (methods) {
            _this.enrollmentMethods = methods;
            _this.enrollmentMethods.forEach(function (method) {
                if (method.type === 'self') {
                    _this.selfEnrolInstances.push(method);
                }
                else if (_this.guestWSAvailable && method.type === 'guest') {
                    _this.isGuestEnabled = true;
                }
            });
        }).catch(function (error) {
            _this.domUtils.showErrorModalDefault(error, 'Error getting enrolment data');
        }).then(function () {
            // Check if user is enrolled in the course.
            return _this.coursesProvider.getUserCourse(_this.course.id).then(function (course) {
                _this.isEnrolled = true;
                return course;
            }).catch(function () {
                // The user is not enrolled in the course. Use getCourses to see if it's an admin/manager and can see the course.
                _this.isEnrolled = false;
                return _this.coursesProvider.getCourse(_this.course.id);
            }).then(function (course) {
                // Success retrieving the course, we can assume the user has permissions to view it.
                _this.course.fullname = course.fullname || _this.course.fullname;
                _this.course.summary = course.summary || _this.course.summary;
                _this.canAccessCourse = true;
            }).catch(function () {
                // The user is not an admin/manager. Check if we can provide guest access to the course.
                return _this.canAccessAsGuest().then(function (passwordRequired) {
                    _this.canAccessCourse = !passwordRequired;
                }).catch(function () {
                    _this.canAccessCourse = false;
                });
            });
        }).finally(function () {
            _this.dataLoaded = true;
        });
    };
    /**
     * Open the course.
     */
    CoreCoursesCoursePreviewPage.prototype.openCourse = function () {
        if (!this.canAccessCourse || this.avoidOpenCourse) {
            // Course cannot be opened or we are avoiding opening because we accessed from inside a course.
            return;
        }
        this.courseFormatDelegate.openCourse(this.navCtrl, this.course);
    };
    /**
     * Enrol using PayPal.
     */
    CoreCoursesCoursePreviewPage.prototype.paypalEnrol = function () {
        var _this = this;
        var window, hasReturnedFromPaypal = false, inAppLoadSubscription, inAppFinishSubscription, inAppExitSubscription, appResumeSubscription;
        var urlLoaded = function (event) {
            if (event.url.indexOf(_this.paypalReturnUrl) != -1) {
                hasReturnedFromPaypal = true;
            }
            else if (event.url.indexOf(_this.courseUrl) != -1 && hasReturnedFromPaypal) {
                // User reached the course index page after returning from PayPal, close the InAppBrowser.
                inAppClosed();
                window.close();
            }
        }, inAppClosed = function () {
            // InAppBrowser closed, refresh data.
            unsubscribeAll();
            if (!_this.dataLoaded) {
                return;
            }
            _this.dataLoaded = false;
            _this.refreshData();
        }, unsubscribeAll = function () {
            inAppLoadSubscription && inAppLoadSubscription.unsubscribe();
            inAppFinishSubscription && inAppFinishSubscription.unsubscribe();
            inAppExitSubscription && inAppExitSubscription.unsubscribe();
            appResumeSubscription && appResumeSubscription.unsubscribe();
        };
        // Open the enrolment page in InAppBrowser.
        this.sitesProvider.getCurrentSite().openInAppWithAutoLogin(this.enrolUrl).then(function (w) {
            window = w;
            if (_this.isDesktop || _this.isMobile) {
                // Observe loaded pages in the InAppBrowser to check if the enrol process has ended.
                inAppLoadSubscription = window.on('loadstart').subscribe(function (event) {
                    // Execute the callback in the Angular zone, so change detection doesn't stop working.
                    _this.zone.run(function () { return urlLoaded(event); });
                });
                // Observe window closed.
                inAppExitSubscription = window.on('exit').subscribe(function () {
                    // Execute the callback in the Angular zone, so change detection doesn't stop working.
                    _this.zone.run(inAppClosed);
                });
            }
            if (_this.isDesktop) {
                // In desktop, also observe stop loading since some pages don't throw the loadstart event.
                inAppFinishSubscription = window.on('loadstop').subscribe(urlLoaded);
                // Since the user can switch windows, reload the data if he comes back to the app.
                appResumeSubscription = _this.platform.resume.subscribe(function () {
                    if (!_this.dataLoaded) {
                        return;
                    }
                    _this.dataLoaded = false;
                    _this.refreshData();
                });
            }
        });
    };
    /**
     * User clicked in a self enrol button.
     *
     * @param {number} instanceId The instance ID of the enrolment method.
     */
    CoreCoursesCoursePreviewPage.prototype.selfEnrolClicked = function (instanceId) {
        var _this = this;
        this.domUtils.showConfirm(this.translate.instant('core.courses.confirmselfenrol')).then(function () {
            _this.selfEnrolInCourse('', instanceId);
        }).catch(function () {
            // User cancelled.
        });
    };
    /**
     * Self enrol in a course.
     *
     * @param {string} password Password to use.
     * @param {number} instanceId The instance ID.
     * @return {Promise<any>} Promise resolved when self enrolled.
     */
    CoreCoursesCoursePreviewPage.prototype.selfEnrolInCourse = function (password, instanceId) {
        var _this = this;
        var modal = this.domUtils.showModalLoading('core.loading', true);
        return this.coursesProvider.selfEnrol(this.course.id, password, instanceId).then(function () {
            // Close modal and refresh data.
            _this.isEnrolled = true;
            _this.dataLoaded = false;
            // Sometimes the list of enrolled courses takes a while to be updated. Wait for it.
            _this.waitForEnrolled(true).then(function () {
                _this.refreshData().finally(function () {
                    // My courses have been updated, trigger event.
                    _this.eventsProvider.trigger(__WEBPACK_IMPORTED_MODULE_8__providers_courses__["a" /* CoreCoursesProvider */].EVENT_MY_COURSES_UPDATED, {}, _this.sitesProvider.getCurrentSiteId());
                });
            });
        }).catch(function (error) {
            if (error && error.code === __WEBPACK_IMPORTED_MODULE_8__providers_courses__["a" /* CoreCoursesProvider */].ENROL_INVALID_KEY) {
                // Invalid password, show the modal to enter the password.
                _this.selfEnrolModal.present();
                _this.currentInstanceId = instanceId;
                if (!password) {
                    // No password entered, don't show error.
                    return;
                }
            }
            _this.domUtils.showErrorModalDefault(error, 'core.courses.errorselfenrol', true);
        }).finally(function () {
            modal.dismiss();
        });
    };
    /**
     * Refresh the data.
     *
     * @param {any} [refresher] The refresher if this was triggered by a Pull To Refresh.
     */
    CoreCoursesCoursePreviewPage.prototype.refreshData = function (refresher) {
        var _this = this;
        var promises = [];
        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.coursesProvider.invalidateCourse(this.course.id));
        promises.push(this.coursesProvider.invalidateCourseEnrolmentMethods(this.course.id));
        promises.push(this.courseOptionsDelegate.clearAndInvalidateCoursesOptions(this.course.id));
        if (this.guestInstanceId) {
            promises.push(this.coursesProvider.invalidateCourseGuestEnrolmentInfo(this.guestInstanceId));
        }
        return Promise.all(promises).finally(function () {
            return _this.getCourse(true);
        }).finally(function () {
            if (refresher) {
                refresher.complete();
            }
        });
    };
    /**
     * Update the course status icon and title.
     *
     * @param {string} status Status to show.
     */
    CoreCoursesCoursePreviewPage.prototype.updateCourseStatus = function (status) {
        var statusData = this.courseHelper.getCourseStatusIconAndTitleFromStatus(status);
        this.prefetchCourseData.prefetchCourseIcon = statusData.icon;
        this.prefetchCourseData.title = statusData.title;
    };
    /**
     * Wait for the user to be enrolled in the course.
     *
     * @param {boolean} first If it's the first call (true) or it's a recursive call (false).
     * @return {Promise<any>} Promise resolved when enrolled or timeout.
     */
    CoreCoursesCoursePreviewPage.prototype.waitForEnrolled = function (first) {
        var _this = this;
        if (first) {
            this.waitStart = Date.now();
        }
        // Check if user is enrolled in the course.
        return this.coursesProvider.invalidateUserCourses().catch(function () {
            // Ignore errors.
        }).then(function () {
            return _this.coursesProvider.getUserCourse(_this.course.id);
        }).catch(function () {
            // Not enrolled, wait a bit and try again.
            if (_this.pageDestroyed || (Date.now() - _this.waitStart > 60000)) {
                // Max time reached or the user left the view, stop.
                return;
            }
            return new Promise(function (resolve, reject) {
                setTimeout(function () {
                    if (!_this.pageDestroyed) {
                        // Wait again.
                        _this.waitForEnrolled().then(resolve);
                    }
                    else {
                        resolve();
                    }
                }, 5000);
            });
        });
    };
    /**
     * Prefetch the course.
     */
    CoreCoursesCoursePreviewPage.prototype.prefetchCourse = function () {
        var _this = this;
        this.courseHelper.confirmAndPrefetchCourse(this.prefetchCourseData, this.course).catch(function (error) {
            if (!_this.pageDestroyed) {
                _this.domUtils.showErrorModalDefault(error, 'core.course.errordownloadingcourse', true);
            }
        });
    };
    CoreCoursesCoursePreviewPage = __decorate([
        Object(__WEBPACK_IMPORTED_MODULE_0__angular_core__["m" /* Component */])({
            selector: 'page-core-courses-course-preview',template:/*ion-inline-start:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/course-preview/course-preview.html"*/'<ion-header>\n    <ion-navbar core-back-button>\n        <ion-title><core-format-text [text]="course.fullname"></core-format-text></ion-title>\n    </ion-navbar>\n</ion-header>\n<ion-content>\n    <ion-refresher [enabled]="dataLoaded" (ionRefresh)="refreshData($event)">\n        <ion-refresher-content pullingText="{{ \'core.pulltorefresh\' | translate }}"></ion-refresher-content>\n    </ion-refresher>\n    <core-loading [hideUntil]="dataLoaded">\n\n        <ion-list *ngIf="course">\n            <div *ngIf="course.imageThumb" (click)="openCourse()" class="core-course-thumb">\n                <img [src]="course.imageThumb" core-external-content alt=""/>\n            </div>\n            <a ion-item text-wrap (click)="openCourse()" [title]="course.fullname" [attr.detail-none]=" avoidOpenCourse || !canAccessCourse">\n                <core-icon name="fa-graduation-cap" fixed-width item-start></core-icon>\n                <h2><core-format-text [text]="course.fullname"></core-format-text></h2>\n                <p *ngIf="course.categoryname"><core-format-text [text]="course.categoryname"></core-format-text></p>\n                <p *ngIf="course.startdate">{{course.startdate * 1000 | coreFormatDate:"dfdaymonthyear"}} <span *ngIf="course.enddate"> - {{course.enddate * 1000 | coreFormatDate:"dfdaymonthyear"}}</span></p>\n            </a>\n\n            <ion-item text-wrap *ngIf="course.summary" detail-none>\n                <core-format-text [text]="course.summary" maxHeight="120"></core-format-text>\n            </ion-item>\n\n            <ng-container text-wrap *ngIf="course.contacts && course.contacts.length">\n                <ion-item-divider color="light">{{ \'core.teachers\' | translate }}</ion-item-divider>\n                <a ion-item text-wrap *ngFor="let contact of course.contacts" core-user-link userId="{{contact.id}}" courseId="{{isEnrolled ? course.id : null}}" [attr.aria-label]="\'core.viewprofile\' | translate">\n                    <ion-avatar item-start>\n                        <img [src]="contact.userpictureurl" onError="this.src=\'assets/img/user-avatar.png\'" core-external-content [alt]="\'core.pictureof\' | translate:{$a: contact.userfullname}" role="presentation">\n                    </ion-avatar>\n                    <h2>{{contact.fullname}}</h2>\n                </a>\n                <ion-item-divider color="light"></ion-item-divider>\n            </ng-container>\n            <core-file *ngFor="let file of course.overviewfiles" [file]="file" [component]="component" [componentId]="course.id"></core-file>\n            <div *ngIf="!isEnrolled" detail-none>\n                <ion-item text-wrap *ngFor="let instance of selfEnrolInstances">\n                    <h2>{{ instance.name }}</h2>\n                    <button ion-button block margin-top (click)="selfEnrolClicked(instance.id)">{{ \'core.courses.enrolme\' | translate }}</button>\n                </ion-item>\n            </div>\n            <ion-item text-wrap *ngIf="!isEnrolled && paypalEnabled" detail-none>\n                <h2>{{ \'core.courses.paypalaccepted\' | translate }}</h2>\n                <p>{{ \'core.paymentinstant\' | translate }}</p>\n                <button ion-button block margin-top (click)="paypalEnrol()">{{ \'core.courses.sendpaymentbutton\' | translate }}</button>\n            </ion-item>\n            <ion-item *ngIf="!isEnrolled && !selfEnrolInstances.length && !paypalEnabled">\n                <p>{{ \'core.courses.notenrollable\' | translate }}</p>\n            </ion-item>\n            <a ion-item *ngIf="canAccessCourse && downloadCourseEnabled" (click)="prefetchCourse()" detail-none [attr.aria-label]="prefetchCourseData.title | translate">\n                <core-icon *ngIf="prefetchCourseData.prefetchCourseIcon != \'spinner\'" [name]="prefetchCourseData.prefetchCourseIcon" item-start></core-icon>\n                <ion-spinner *ngIf="prefetchCourseData.prefetchCourseIcon == \'spinner\'" item-start></ion-spinner>\n                <h2>{{ \'core.course.downloadcourse\' | translate }}</h2>\n            </a>\n            <a ion-item (click)="openCourse()" [title]="course.fullname" *ngIf="!avoidOpenCourse && canAccessCourse">\n                <ion-icon name="briefcase" item-start></ion-icon>\n                <h2>{{ \'core.course.contents\' | translate }}</h2>\n            </a>\n        </ion-list>\n    </core-loading>\n</ion-content>\n'/*ion-inline-end:"/home/alemat/echpd/moodlemobile2/src/core/courses/pages/course-preview/course-preview.html"*/,
        }),
        __metadata("design:paramtypes", [__WEBPACK_IMPORTED_MODULE_1_ionic_angular__["r" /* NavController */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["s" /* NavParams */], __WEBPACK_IMPORTED_MODULE_5__providers_sites__["a" /* CoreSitesProvider */],
            __WEBPACK_IMPORTED_MODULE_6__providers_utils_dom__["a" /* CoreDomUtilsProvider */], __WEBPACK_IMPORTED_MODULE_7__providers_utils_text__["a" /* CoreTextUtilsProvider */], __WEBPACK_IMPORTED_MODULE_3__providers_app__["a" /* CoreAppProvider */],
            __WEBPACK_IMPORTED_MODULE_8__providers_courses__["a" /* CoreCoursesProvider */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["u" /* Platform */], __WEBPACK_IMPORTED_MODULE_1_ionic_angular__["p" /* ModalController */],
            __WEBPACK_IMPORTED_MODULE_2__ngx_translate_core__["c" /* TranslateService */], __WEBPACK_IMPORTED_MODULE_4__providers_events__["a" /* CoreEventsProvider */],
            __WEBPACK_IMPORTED_MODULE_9__core_course_providers_options_delegate__["a" /* CoreCourseOptionsDelegate */], __WEBPACK_IMPORTED_MODULE_11__core_course_providers_helper__["a" /* CoreCourseHelperProvider */],
            __WEBPACK_IMPORTED_MODULE_10__core_course_providers_course__["a" /* CoreCourseProvider */], __WEBPACK_IMPORTED_MODULE_12__core_course_providers_format_delegate__["a" /* CoreCourseFormatDelegate */],
            __WEBPACK_IMPORTED_MODULE_0__angular_core__["M" /* NgZone */]])
    ], CoreCoursesCoursePreviewPage);
    return CoreCoursesCoursePreviewPage;
}());

//# sourceMappingURL=course-preview.js.map

/***/ })

});
//# sourceMappingURL=43.js.map