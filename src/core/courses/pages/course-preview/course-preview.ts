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

import { Component, OnDestroy } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, ModalController, Modal } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '../../../../providers/app';
import { CoreEventsProvider } from '../../../../providers/events';
import { CoreSitesProvider } from '../../../../providers/sites';
import { CoreDomUtilsProvider } from '../../../../providers/utils/dom';
import { CoreTextUtilsProvider } from '../../../../providers/utils/text';
import { CoreCoursesProvider } from '../../providers/courses';
import { CoreCoursesDelegate } from '../../providers/delegate';

/**
 * Page that allows "previewing" a course and enrolling in it if enabled and not enrolled.
 */
@IonicPage({segment: "core-courses-course-preview"})
@Component({
    selector: 'page-core-courses-course-preview',
    templateUrl: 'course-preview.html',
})
export class CoreCoursesCoursePreviewPage implements OnDestroy {
    course: any;
    isEnrolled: boolean;
    handlersShouldBeShown: boolean = true;
    handlersLoaded: boolean;
    component = 'CoreCoursesCoursePreview';
    selfEnrolInstances: any[] = [];
    paypalEnabled: boolean;
    dataLoaded: boolean;
    prefetchCourseIcon: string;

    protected guestWSAvailable: boolean;
    protected isGuestEnabled: boolean = false;
    protected guestInstanceId: number;
    protected enrollmentMethods: any[];
    protected waitStart = 0;
    protected enrolUrl: string;
    protected courseUrl: string;
    protected paypalReturnUrl: string;
    protected isMobile: boolean;
    protected isDesktop: boolean;
    protected selfEnrolModal: Modal;
    protected pageDestroyed = false;
    protected currentInstanceId: number;

    constructor(private navCtrl: NavController, navParams: NavParams, private sitesProvider: CoreSitesProvider,
            private domUtils: CoreDomUtilsProvider, private textUtils: CoreTextUtilsProvider, appProvider: CoreAppProvider,
            private coursesProvider: CoreCoursesProvider, private platform: Platform, private modalCtrl: ModalController,
            private translate: TranslateService, private eventsProvider: CoreEventsProvider,
            private coursesDelegate: CoreCoursesDelegate) {
        this.course = navParams.get('course');
        this.isMobile = appProvider.isMobile();
        this.isDesktop = appProvider.isDesktop();
    }

    /**
     * View loaded.
     */
    ionViewDidLoad() {
        const currentSite = this.sitesProvider.getCurrentSite(),
            currentSiteUrl = currentSite && currentSite.getURL();

        this.paypalEnabled = this.course.enrollmentmethods && this.course.enrollmentmethods.indexOf('paypal') > -1;
        this.guestWSAvailable = this.coursesProvider.isGuestWSAvailable();
        this.enrolUrl = this.textUtils.concatenatePaths(currentSiteUrl, 'enrol/index.php?id=' + this.course.id);
        this.courseUrl = this.textUtils.concatenatePaths(currentSiteUrl, 'course/view.php?id=' + this.course.id);
        this.paypalReturnUrl = this.textUtils.concatenatePaths(currentSiteUrl, 'enrol/paypal/return.php');

        // Initialize the self enrol modal.
        this.selfEnrolModal = this.modalCtrl.create('CoreCoursesSelfEnrolPasswordPage');
        this.selfEnrolModal.onDidDismiss((password: string) => {
            if (typeof password != 'undefined') {
                this.selfEnrolInCourse(password, this.currentInstanceId);
            }
        });

        this.getCourse().finally(() => {
            // @todo: Prefetch course.
        });
    }

    /**
     * Page destroyed.
     */
    ngOnDestroy() {
        this.pageDestroyed = true;
    }

    /**
     * Check if the user can access as guest.
     *
     * @return {Promise<boolean>} Promise resolved if can access as guest, rejected otherwise. Resolve param indicates if
     *                            password is required for guest access.
     */
    protected canAccessAsGuest() : Promise<boolean> {
        if (!this.isGuestEnabled) {
            return Promise.reject(null);
        }

        // Search instance ID of guest enrolment method.
        this.guestInstanceId = undefined;
        for (let i = 0; i < this.enrollmentMethods.length; i++) {
            let method = this.enrollmentMethods[i];
            if (method.type == 'guest') {
                this.guestInstanceId = method.id;
                break;
            }
        }

        if (this.guestInstanceId) {
            return this.coursesProvider.getCourseGuestEnrolmentInfo(this.guestInstanceId).then((info) => {
                if (!info.status) {
                    // Not active, reject.
                    return Promise.reject(null);
                }
                return info.passwordrequired;
            });
        }

        return Promise.reject(null);
    }

    /**
     * Convenience function to get course. We use this to determine if a user can see the course or not.
     *
     * @param {boolean} refresh Whether the user is refreshing the data.
     */
    protected getCourse(refresh?: boolean) : Promise<any> {
        // Get course enrolment methods.
        this.selfEnrolInstances = [];
        return this.coursesProvider.getCourseEnrolmentMethods(this.course.id).then((methods) => {
            this.enrollmentMethods = methods;

            this.enrollmentMethods.forEach((method) => {
                if (method.type === 'self') {
                    this.selfEnrolInstances.push(method);
                } else if (this.guestWSAvailable && method.type === 'guest') {
                    this.isGuestEnabled = true;
                }
            });
        }).catch((error) => {
            this.domUtils.showErrorModalDefault(error, 'Error getting enrolment data');
        }).then(() => {
            // Check if user is enrolled in the course.
            return this.coursesProvider.getUserCourse(this.course.id).then((course) => {
                this.isEnrolled = true;
                return course;
            }).catch(() => {
                // The user is not enrolled in the course. Use getCourses to see if it's an admin/manager and can see the course.
                this.isEnrolled = false;
                return this.coursesProvider.getCourse(this.course.id);
            }).then((course) => {
                // Success retrieving the course, we can assume the user has permissions to view it.
                this.course.fullname = course.fullname || this.course.fullname;
                this.course.summary = course.summary || this.course.summary;
                return this.loadCourseHandlers(refresh, false);
            }).catch(() => {
                // The user is not an admin/manager. Check if we can provide guest access to the course.
                return this.canAccessAsGuest().then((passwordRequired) => {
                    if (!passwordRequired) {
                        return this.loadCourseHandlers(refresh, true);
                    } else {
                        return Promise.reject(null);
                    }
                }).catch(() => {
                    this.course._handlers = [];
                    this.handlersShouldBeShown = false;
                });
            });
        }).finally(() => {
            this.dataLoaded = true;
        });
    }

    /**
     * Load course nav handlers.
     *
     * @param {boolean} refresh Whether the user is refreshing the data.
     * @param {boolean} guest Whether it's guest access.
     */
    protected loadCourseHandlers(refresh: boolean, guest: boolean) : Promise<any> {
        return this.coursesDelegate.getHandlersToDisplay(this.course, refresh, guest, true).then((handlers) => {
            this.course._handlers = handlers;
            this.handlersShouldBeShown = true;
            this.handlersLoaded = true;
        });
    }

    /**
     * Open the course.
     */
    openCourse() {
        if (!this.handlersShouldBeShown) {
            // Course cannot be opened.
            return;
        }

        this.navCtrl.push('CoreCourseSectionPage', {course: this.course});
    }

    /**
     * Enrol using PayPal.
     */
    paypalEnrol() {
        let window,
            hasReturnedFromPaypal = false,
            inAppLoadSubscription,
            inAppFinishSubscription,
            inAppExitSubscription,
            appResumeSubscription,
            urlLoaded = (event) => {
                if (event.url.indexOf(this.paypalReturnUrl) != -1) {
                    hasReturnedFromPaypal = true;
                } else if (event.url.indexOf(this.courseUrl) != -1 && hasReturnedFromPaypal) {
                    // User reached the course index page after returning from PayPal, close the InAppBrowser.
                    inAppClosed();
                    window.close();
                }
            },
            inAppClosed = () => {
                // InAppBrowser closed, refresh data.
                unsubscribeAll();

                if (!this.dataLoaded) {
                    return;
                }
                this.dataLoaded = false;
                this.refreshData();
            },
            unsubscribeAll = () => {
                inAppLoadSubscription && inAppLoadSubscription.unsubscribe();
                inAppFinishSubscription && inAppFinishSubscription.unsubscribe();
                inAppExitSubscription && inAppExitSubscription.unsubscribe();
                appResumeSubscription && appResumeSubscription.unsubscribe();
            };

        // Open the enrolment page in InAppBrowser.
        this.sitesProvider.getCurrentSite().openInAppWithAutoLogin(this.enrolUrl).then((w) => {
            window = w;

            if (this.isDesktop || this.isMobile) {
                // Observe loaded pages in the InAppBrowser to check if the enrol process has ended.
                inAppLoadSubscription = window.on('loadstart').subscribe(urlLoaded);
                // Observe window closed.
                inAppExitSubscription = window.on('exit').subscribe(inAppClosed);
            }

            if (this.isDesktop) {
                // In desktop, also observe stop loading since some pages don't throw the loadstart event.
                inAppFinishSubscription = window.on('loadstop').subscribe(urlLoaded);

                // Since the user can switch windows, reload the data if he comes back to the app.
                appResumeSubscription = this.platform.resume.subscribe(() => {
                    if (!this.dataLoaded) {
                        return;
                    }
                    this.dataLoaded = false;
                    this.refreshData();
                });
            }
        });
    }

    /**
     * User clicked in a self enrol button.
     *
     * @param {number} instanceId The instance ID of the enrolment method.
     */
    selfEnrolClicked(instanceId: number) {
        this.domUtils.showConfirm(this.translate.instant('core.courses.confirmselfenrol')).then(() => {
            this.selfEnrolInCourse('', instanceId);
        }).catch(() => {
            // User cancelled.
        });
    }

    /**
     * Self enrol in a course.
     *
     * @param {string} password Password to use.
     * @param {number} instanceId The instance ID.
     * @return {Promise<any>} Promise resolved when self enrolled.
     */
    selfEnrolInCourse(password: string, instanceId: number) : Promise<any> {
        let modal = this.domUtils.showModalLoading('core.loading', true);

        return this.coursesProvider.selfEnrol(this.course.id, password, instanceId).then(() => {
            // Close modal and refresh data.
            this.isEnrolled = true;
            this.dataLoaded = false;

            // Sometimes the list of enrolled courses takes a while to be updated. Wait for it.
            this.waitForEnrolled(true).then(() => {
                this.refreshData().finally(() => {
                    // My courses have been updated, trigger event.
                    this.eventsProvider.trigger(
                            CoreCoursesProvider.EVENT_MY_COURSES_UPDATED, {}, this.sitesProvider.getCurrentSiteId());
                });
            });
        }).catch((error) => {
            if (error && error.code === CoreCoursesProvider.ENROL_INVALID_KEY) {
                // Invalid password, show the modal to enter the password.
                this.selfEnrolModal.present();
                this.currentInstanceId = instanceId;

                if (!password) {
                    // No password entered, don't show error.
                    return;
                }
            }

            this.domUtils.showErrorModalDefault(error, 'core.courses.errorselfenrol', true);
        }).finally(() => {
            modal.dismiss();
        });
    }

    /**
     * Refresh the data.
     *
     * @param {any} [refresher] The refresher if this was triggered by a Pull To Refresh.
     */
    refreshData(refresher?: any) : Promise<any> {
        let promises = [];

        promises.push(this.coursesProvider.invalidateUserCourses());
        promises.push(this.coursesProvider.invalidateCourse(this.course.id));
        promises.push(this.coursesProvider.invalidateCourseEnrolmentMethods(this.course.id));
        // promises.push($mmCoursesDelegate.clearAndInvalidateCoursesOptions(course.id));
        if (this.guestInstanceId) {
            promises.push(this.coursesProvider.invalidateCourseGuestEnrolmentInfo(this.guestInstanceId));
        }

        return Promise.all(promises).finally(() => {
            return this.getCourse(true);
        }).finally(() => {
            if (refresher) {
                refresher.complete();
            }
        });
    }

    /**
     * Wait for the user to be enrolled in the course.
     *
     * @param {boolean} first If it's the first call (true) or it's a recursive call (false).
     */
    protected waitForEnrolled(first?: boolean) {
        if (first) {
            this.waitStart = Date.now();
        }

        // Check if user is enrolled in the course.
        return this.coursesProvider.invalidateUserCourses().catch(() => {
            // Ignore errors.
        }).then(() => {
            return this.coursesProvider.getUserCourse(this.course.id);
        }).catch(() => {
            // Not enrolled, wait a bit and try again.
            if (this.pageDestroyed || (Date.now() - this.waitStart > 60000)) {
                // Max time reached or the user left the view, stop.
                return;
            }

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (!this.pageDestroyed) {
                        // Wait again.
                        this.waitForEnrolled().then(resolve);
                    } else {
                        resolve();
                    }
                }, 5000);
            });
        });
    }
}
