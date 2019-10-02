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

import { Component, Optional, ElementRef, Renderer, ViewEncapsulation, forwardRef, ViewChild, Input,
    OnDestroy } from '@angular/core';
import {
    Tabs, Tab, NavController, ViewController, App, Config, Platform, DeepLinker, Keyboard, RootNode, NavOptions
} from 'ionic-angular';
import { CoreIonTabComponent } from './ion-tab';
import { CoreUtilsProvider, PromiseDefer } from '@providers/utils/utils';
import { CoreAppProvider } from '@providers/app';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { TranslateService } from '@ngx-translate/core';

/**
 * Equivalent to ion-tabs. It has several improvements:
 *     - If a core-ion-tab is added or removed, it will be reflected in the tab bar in the right position.
 *     - It supports a loaded input to tell when are the tabs ready.
 *     - When the user clicks the tab again to go to root, a confirm modal is shown.
 */
@Component({
    selector: 'core-ion-tabs',
    templateUrl: 'core-ion-tabs.html',
    encapsulation: ViewEncapsulation.None,
    providers: [{provide: RootNode, useExisting: forwardRef(() => CoreIonTabsComponent) }]
})
export class CoreIonTabsComponent extends Tabs implements OnDestroy {

    /**
     * Whether the tabs have been loaded. If defined, tabs won't be initialized until it's set to true.
     */
    @Input() set loaded(val: boolean) {
        this._loaded = this.utils.isTrueOrOne(val);

        if (this.viewInit && !this.initialized) {
            // Use a setTimeout to make sure the tabs have been loaded.
            setTimeout(() => {
                this.initTabs();
            });
        }
    }

    @Input() selectedDisabled: boolean; // Whether the initial tab selected can be a disabled tab.

    @ViewChild('originalTabs') originalTabsRef: ElementRef;

    _loaded: boolean; // Whether tabs have been loaded.
    hidden = false; // Whether to show/hide tabs.

    /**
     * List of tabs that haven't been initialized yet. This is required because IonTab calls add() on the constructor,
     * but we need it to be called in OnInit to be able to determine the tab position.
     */
    protected tabsNotInit: CoreIonTabComponent[] = [];

    protected tabsIds: string[] = []; // An array to keep the order of tab IDs when they're sorted.
    protected tabsNotInitIds: string[] = []; // An array to keep the order of tab IDs for non-init tabs.
    protected viewInit = false; // Whether the view has been initialized.
    protected initialized = false; // Whether tabs have been initialized.

    protected firstSelectedTab: string;
    protected unregisterBackButtonAction: any;
    protected selectTabPromiseDefer: PromiseDefer;

    constructor(protected utils: CoreUtilsProvider, protected appProvider: CoreAppProvider, @Optional() parent: NavController,
            @Optional() viewCtrl: ViewController, _app: App, config: Config, elementRef: ElementRef, _plt: Platform,
            renderer: Renderer, _linker: DeepLinker, protected domUtils: CoreDomUtilsProvider,
            protected translate: TranslateService, keyboard?: Keyboard) {
        super(parent, viewCtrl, _app, config, elementRef, _plt, renderer, _linker, keyboard);
    }

    /**
     * View has been initialized.
     */
    ngAfterViewInit(): void {
        this.viewInit = true;

        super.ngAfterViewInit();

        this.registerBackButtonAction();
    }

    /**
     * Add a new tab if it isn't already in the list of tabs.
     *
     * @param tab The tab to add.
     * @param isInit Whether the tab has been initialized.
     * @return The tab ID.
     */
    add(tab: CoreIonTabComponent, isInit?: boolean): string {
        // Check if tab is already in the list of initialized tabs.
        let position = this._tabs.indexOf(tab);

        if (position != -1) {
            return this.tabsIds[position];
        }

        // Now check if the tab is in the not init list.
        position = this.tabsNotInit.indexOf(tab);
        if (position != -1) {
            if (!isInit) {
                return this.tabsNotInitIds[position];
            }

            // The tab wasn't initialized but now it is. Move it from one array to the other.
            const tabId = this.tabsNotInitIds[position];
            this.tabsNotInit.splice(position, 1);
            this.tabsNotInitIds.splice(position, 1);

            this._tabs.push(tab);
            this.tabsIds.push(tabId);

            this.sortTabs();

            return tabId;
        }

        // Tab is new. In this case isInit should always be false, but check it just in case.
        const id = this.id + '-' + (++this._ids);

        if (isInit) {
            this._tabs.push(tab);
            this.tabsIds.push(id);

            this.sortTabs();
        } else {
            this.tabsNotInit.push(tab);
            this.tabsNotInitIds.push(id);
        }

        return id;
    }

    /**
     * Initialize the tabs.
     *
     * @return Promise resolved when done.
     */
    initTabs(): Promise<any> {
        if (!this.initialized && (this._loaded || typeof this._loaded == 'undefined')) {
            this.initialized = true;

            return super.initTabs().then(() => {
                // Tabs initialized. Force select the tab if it's not enabled.
                if (this.selectedDisabled && typeof this.selectedIndex != 'undefined') {
                    const tab = this.getByIndex(this.selectedIndex);
                    if (tab && !tab.enabled) {
                        this.select(tab);
                    }
                }

                this.firstSelectedTab = this._selectHistory[0] || null;
            }).finally(() => {
                // If there was a select promise pending to be resolved, do it now.
                if (this.selectTabPromiseDefer) {
                    this.selectTabPromiseDefer.resolve();
                    delete this.selectTabPromiseDefer;
                }
            });
        } else {
            // Tabs not loaded yet. Set the tab bar position so the tab bar is shown, it'll have a spinner.
            this.setTabbarPosition(-1, 0);

            return Promise.resolve();
        }
    }

    /**
     * Register back button action.
     */
    protected registerBackButtonAction(): void {
        this.unregisterBackButtonAction = this.appProvider.registerBackButtonAction(() => {
            let tab = this.previousTab(true);

            if (tab) {
                const selectedTab = this.getSelected();

                // It can happen when the previous is a phantom tab.
                if (tab.id == selectedTab.id) {
                    tab = this.previousTab(true);
                }

                if (tab) {
                    // Remove curent and previous tabs from history.
                    this._selectHistory = this._selectHistory.filter((tabId) => {
                        return selectedTab.id != tabId && tab.id != tabId;
                    });

                    this.select(tab);

                    return true;
                }
            } else  {
                const selected = this.getSelected();
                if (selected && this.firstSelectedTab && selected.id != this.firstSelectedTab) {
                    // All history is gone but we are not in the first selected tab.
                    this._selectHistory = [];

                    tab = this._tabs.find((t) => { return t.id === this.firstSelectedTab; });
                    if (tab && tab.enabled) {
                        this.select(tab);

                        return true;
                    }
                }
            }

            return false;
        }, 250);
    }

    /**
     * Remove a tab from the list of tabs.
     *
     * @param tab The tab to remove.
     */
    remove(tab: CoreIonTabComponent): void {
        // First search in the list of initialized tabs.
        let index = this._tabs.indexOf(tab);

        if (index != -1) {
            this._tabs.splice(index, 1);
            this.tabsIds.splice(index, 1);
        } else {
            // Not found, search in the list of non-init tabs.
            index = this.tabsNotInit.indexOf(tab);

            if (index != -1) {
                this.tabsNotInit.splice(index, 1);
                this.tabsNotInitIds.splice(index, 1);
            }
        }
    }

    /**
     * Sort the tabs, keeping the same order as in the original list.
     */
    sortTabs(): void {
        if (this.originalTabsRef) {
            const newTabs = [],
                newTabsIds = [],
                originalTabsEl = this.originalTabsRef.nativeElement;

            this._tabs.forEach((tab, index) => {
                const originalIndex = Array.prototype.indexOf.call(originalTabsEl.children, tab.getNativeElement());
                if (originalIndex != -1) {
                    newTabs[originalIndex] = tab;
                    newTabsIds[originalIndex] = this.tabsIds[index];
                }
            });

            // Remove undefined values. It can happen if the view has some tabs that were destroyed but weren't removed yet.
            this._tabs = newTabs.filter((tab) => {
                return typeof tab != 'undefined';
            });
            this.tabsIds = newTabsIds.filter((id) => {
                return typeof id != 'undefined';
            });
        }
    }

    /**
     * Select a tab.
     *
     * @param tabOrIndex Index, or the Tab instance, of the tab to select.
     * @param Nav options.
     * @param fromUrl Whether to load from a URL.
     * @param manualClick Whether the user manually clicked the tab.
     * @return Promise resolved when selected.
     */
    select(tabOrIndex: number | Tab, opts: NavOptions = {}, fromUrl?: boolean, manualClick?: boolean): Promise<any> {

        if (this.initialized) {
            // Tabs have been initialized, select the tab.
            if (manualClick) {
                // If we'll go to the root of the current tab, ask the user to confirm first.
                const tab = typeof tabOrIndex == 'number' ? this.getByIndex(tabOrIndex) : tabOrIndex;

                return this.confirmGoToRoot(tab).then(() => {
                    return super.select(tabOrIndex, opts, fromUrl);
                }, () => {
                    // User cancelled.
                });
            }

            return super.select(tabOrIndex, opts, fromUrl);
        } else {
            // Tabs not initialized yet. Mark it as "selectedIndex" input so it's treated when the tabs are initialized.
            if (typeof tabOrIndex == 'number') {
                this.selectedIndex = tabOrIndex;
            } else {
                this.selectedIndex = this.getIndex(tabOrIndex);
            }

            // Don't resolve the Promise until the tab is really selected (tabs are initialized).
            this.selectTabPromiseDefer = this.selectTabPromiseDefer || this.utils.promiseDefer();

            return this.selectTabPromiseDefer.promise;
        }
    }

    /**
     * Select a tab by Index. First it will reset the status of the tab.
     *
     * @param index Index of the tab.
     * @return Promise resolved when selected.
     */
    selectTabRootByIndex(index: number): Promise<any> {
        if (this.initialized) {
            const tab = this.getByIndex(index);
            if (tab) {
                return this.confirmGoToRoot(tab).then(() => {
                    // User confirmed, go to root.
                    return tab.goToRoot({animate: tab.isSelected, updateUrl: true, isNavRoot: true}).then(() => {
                        // Tab not previously selected. Select it after going to root.
                        if (!tab.isSelected) {
                            return this.select(tab, {animate: false, updateUrl: true, isNavRoot: true});
                        }
                    });
                }, () => {
                    // User cancelled.
                });
            }

            // Not found.
            return Promise.reject(null);
        } else {
            // Tabs not initialized yet. Mark it as "selectedIndex" input so it's treated when the tabs are initialized.
            this.selectedIndex = index;

            // Don't resolve the Promise until the tab is really selected (tabs are initialized).
            this.selectTabPromiseDefer = this.selectTabPromiseDefer || this.utils.promiseDefer();

            return this.selectTabPromiseDefer.promise;
        }
    }

    /**
     * Change tabs visibility to show/hide them from the view.
     *
     * @param visible If show or hide the tabs.
     */
    changeVisibility(visible: boolean): void {
        if (this.hidden == visible) {
            // Change needed.
            this.hidden = !visible;

            setTimeout(() => {
                this.viewCtrl.getContent().resize();
            });
        }
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        // Unregister the custom back button action for this page
        this.unregisterBackButtonAction && this.unregisterBackButtonAction();
    }

    /**
     * Confirm if the user wants to go to the root of the current tab.
     *
     * @param tab Tab to go to root.
     * @return Promise resolved when confirmed.
     */
    confirmGoToRoot(tab: Tab): Promise<any> {
        if (!tab || !tab.isSelected || (tab.getActive() && tab.getActive().isFirst())) {
            // Tab not selected or is already at root, no need to confirm.
            return Promise.resolve();
        } else {
            if (tab.tabTitle) {
                return this.domUtils.showConfirm(this.translate.instant('core.confirmgotabroot', {name: tab.tabTitle}));
            } else {
                return this.domUtils.showConfirm(this.translate.instant('core.confirmgotabrootdefault'));
            }
        }
    }
}
