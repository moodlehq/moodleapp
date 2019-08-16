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

// Code based on https://github.com/martinpritchardelevate/ionic-split-pane-demo

import { Component, ViewChild, Input, ElementRef, OnInit, Optional, OnDestroy } from '@angular/core';
import { NavController, Nav, ViewController, Platform, Menu } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreFileUploaderProvider } from '@core/fileuploader/providers/fileuploader';
import { Subscription } from 'rxjs';

/**
 * Directive to create a split view layout.
 *
 * @description
 * To init/change the right pane contents (content pane), inject this component in the master page.
 * @ViewChild(CoreSplitViewComponent) splitviewCtrl: CoreSplitViewComponent;
 * Then use the push function to load.
 *
 * Accepts the following params:
 *
 * @param {string|boolean} [when] When the split-pane should be shown. Can be a CSS media query expression, or a shortcut
 * expression. Can also be a boolean expression. Check split-pane component documentation for more information.
 *
 * Example:
 *
 * <core-split-view [when]="lg">
 *     <ion-content><!-- CONTENT TO SHOW ON THE LEFT PANEL (MENU) --></ion-content>
 * </core-split-view>
 */
@Component({
    selector: 'core-split-view',
    templateUrl: 'core-split-view.html'
})
export class CoreSplitViewComponent implements OnInit, OnDestroy {

    @ViewChild('detailNav') detailNav: Nav;
    @ViewChild('menu') menu: Menu;
    @Input() when?: string | boolean = 'md';

    protected isEnabled;
    protected masterPageName = '';
    protected masterPageIndex = 0;
    protected loadDetailPage: any = false;
    protected element: HTMLElement; // Current element.
    protected detailsDidEnterSubscription: Subscription;
    protected masterCanLeaveOverridden = false;
    protected originalMasterCanLeave: Function;
    protected ignoreSplitChanged = false;
    protected audioCaptureSubscription: Subscription;
    protected languageChangedSubscription: Subscription;

    // Empty placeholder for the 'detail' page.
    detailPage: any = null;
    side: string;

    constructor(@Optional() private masterNav: NavController, element: ElementRef, fileUploaderProvider: CoreFileUploaderProvider,
            platform: Platform, translate: TranslateService) {
        this.element = element.nativeElement;

        this.audioCaptureSubscription = fileUploaderProvider.onAudioCapture.subscribe((starting) => {
            this.ignoreSplitChanged = starting;
        });

        // Change the side when the language changes.
        this.languageChangedSubscription = translate.onLangChange.subscribe((event: any) => {
            setTimeout(() => {
                this.side = platform.isRTL ? 'right' : 'left';
                this.menu.setElementAttribute('side', this.side);
            });
        });
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        // Get the master page name and set an empty page as a placeholder.
        this.masterPageName = this.masterNav.getActive().component.name;
        this.masterPageIndex = this.masterNav.indexOf(this.masterNav.getActive());
        this.emptyDetails();

        this.handleCanLeave();
    }

    /**
     * Get the details NavController. If split view is not enabled, it will return the master nav.
     *
     * @return {NavController} Details NavController.
     */
    getDetailsNav(): NavController {
        if (this.isEnabled) {
            return this.detailNav;
        } else {
            return this.masterNav;
        }
    }

    /**
     * Get the master NavController.
     *
     * @return {NavController} Master NavController.
     */
    getMasterNav(): NavController {
        return this.masterNav;
    }

    /**
     * Handle ionViewCanLeave functions in details page. By default, this function isn't captured by Ionic when
     * clicking the back button, it only uses the one in the master page.
     */
    handleCanLeave(): void {
        // Listen for the didEnter event on the details nav to detect everytime a page is loaded.
        this.detailsDidEnterSubscription = this.detailNav.viewDidEnter.subscribe((detailsViewController: ViewController) => {
            if (!this.isOn()) {
                return;
            }

            const masterViewController = this.masterNav.getActive();

            if (this.masterCanLeaveOverridden) {
                // We've overridden the can leave of the master page for a previous details page. Restore it.
                masterViewController.instance.ionViewCanLeave = this.originalMasterCanLeave;
                this.originalMasterCanLeave = undefined;
                this.masterCanLeaveOverridden = false;
            }

            if (detailsViewController && detailsViewController.instance && detailsViewController.instance.ionViewCanLeave) {
                // The details page defines a canLeave function. Check if the master page also defines one.
                if (masterViewController.instance.ionViewCanLeave) {
                    // Master page also defines a canLeave function, store it because it will be overridden.
                    this.originalMasterCanLeave = masterViewController.instance.ionViewCanLeave;
                }

                // Override the master canLeave function so it also calls the details canLeave.
                this.masterCanLeaveOverridden = true;

                masterViewController.instance.ionViewCanLeave = (): Promise<any> => {
                    // Always return a Promise.
                    return Promise.resolve().then(() => {
                        if (this.originalMasterCanLeave) {
                            // First call the master canLeave.
                            const result = this.originalMasterCanLeave.apply(masterViewController.instance);
                            if (typeof result == 'boolean' && !result) {
                                // User cannot leave, return a rejected promise so the details canLeave isn't executed.
                                return Promise.reject(null);
                            } else {
                                return result;
                            }
                        }
                    }).then(() => {
                        // User can leave the master page. Check if he can also leave the details page.
                        return detailsViewController.instance.ionViewCanLeave();
                    });
                };
            }
        });
    }

    /**
     * Check if both panels are shown. It depends on screen width.
     *
     * @return {boolean} If split view is enabled.
     */
    isOn(): boolean {
        return !!this.isEnabled;
    }

    /**
     * Push a page to the navigation stack. It will decide where to load it depending on the size of the screen.
     *
     * @param {any} page   The component class or deeplink name you want to push onto the navigation stack.
     * @param {any} params Any NavParams you want to pass along to the next view.
     * @param {boolean} [retrying] Whether it's retrying.
     */
    push(page: any, params?: any, retrying?: boolean): void {
        if (typeof this.isEnabled == 'undefined' && !retrying) {
            // Hasn't calculated if it's enabled yet. Wait a bit and try again.
            setTimeout(() => {
                this.push(page, params, true);
            }, 200);
        } else {
            if (this.isEnabled) {
                this.detailNav.setRoot(page, params);
            } else {
                this.loadDetailPage = {
                    component: page,
                    data: params
                };
                this.masterNav.push(page, params);
            }
        }
    }

    /**
     * Set the details panel to default info.
     */
    emptyDetails(): void {
        this.loadDetailPage = false;
        this.detailNav.setRoot('CoreSplitViewPlaceholderPage');
    }

    /**
     * Splitpanel visibility has changed.
     *
     * @param {Boolean} isOn If it fits both panels at the same time.
     */
    onSplitPaneChanged(isOn: boolean): void {
        if (this.ignoreSplitChanged) {
            return;
        }

        this.isEnabled = isOn;
        if (this.masterNav && this.detailNav) {
            (isOn) ? this.activateSplitView() : this.deactivateSplitView();
        }
    }

    /**
     * Enable the split view, show both panels and do some magical navigation.
     */
    activateSplitView(): void {
        const currentView = this.masterNav.getActive(),
            currentPageName = currentView.component.name;
        if (this.masterNav.getPrevious() && this.masterNav.getPrevious().component.name == this.masterPageName) {
            if (currentPageName != this.masterPageName) {
                // CurrentView is a 'Detail' page remove it from the 'master' nav stack.
                this.masterNav.pop();

                // And add it to the 'detail' nav stack.
                this.detailNav.setRoot(currentView.component, currentView.data);
            } else if (this.loadDetailPage) {
                // MasterPage is shown, load the last detail page if found.
                this.detailNav.setRoot(this.loadDetailPage.component, this.loadDetailPage.data);
            }
            this.loadDetailPage = false;
        }
    }

    /**
     * Disabled the split view, show only one panel and do some magical navigation.
     */
    deactivateSplitView(): void {
        const detailView = this.detailNav.getActive(),
            currentPageName = detailView.component.name;
        if (currentPageName != 'CoreSplitViewPlaceholderPage') {
            // Current detail view is a 'Detail' page so, not the placeholder page, push it on 'master' nav stack.
            this.masterNav.insert(this.masterPageIndex + 1, detailView.component, detailView.data);
        }
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        this.detailsDidEnterSubscription && this.detailsDidEnterSubscription.unsubscribe();
        this.audioCaptureSubscription.unsubscribe();
        this.languageChangedSubscription.unsubscribe();
    }
}
