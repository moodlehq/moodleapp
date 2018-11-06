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

import { Component, Optional, ElementRef, Renderer, ViewEncapsulation, forwardRef, ViewChild, Input } from '@angular/core';
import { Tabs, NavController, ViewController, App, Config, Platform, DeepLinker, Keyboard, RootNode } from 'ionic-angular';
import { CoreIonTabComponent } from './ion-tab';
import { CoreUtilsProvider } from '@providers/utils/utils';

/**
 * Equivalent to ion-tabs. It has 2 improvements:
 *     - If a core-ion-tab is added or removed, it will be reflected in the tab bar in the right position.
 *     - It supports a loaded input to tell when are the tabs ready.
 */
@Component({
    selector: 'core-ion-tabs',
    templateUrl: 'core-ion-tabs.html',
    encapsulation: ViewEncapsulation.None,
    providers: [{provide: RootNode, useExisting: forwardRef(() => CoreIonTabsComponent) }]
})
export class CoreIonTabsComponent extends Tabs {

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

    /**
     * List of tabs that haven't been initialized yet. This is required because IonTab calls add() on the constructor,
     * but we need it to be called in OnInit to be able to determine the tab position.
     * @type {CoreIonTabComponent[]}
     */
    protected tabsNotInit: CoreIonTabComponent[] = [];

    protected tabsIds: string[] = []; // An array to keep the order of tab IDs when they're sorted.
    protected tabsNotInitIds: string[] = []; // An array to keep the order of tab IDs for non-init tabs.
    protected viewInit = false; // Whether the view has been initialized.
    protected initialized = false; // Whether tabs have been initialized.

    constructor(protected utils: CoreUtilsProvider, @Optional() parent: NavController, @Optional() viewCtrl: ViewController,
            _app: App, config: Config, elementRef: ElementRef, _plt: Platform, renderer: Renderer, _linker: DeepLinker,
            keyboard?: Keyboard) {
        super(parent, viewCtrl, _app, config, elementRef, _plt, renderer, _linker, keyboard);
    }

    /**
     * View has been initialized.
     */
    ngAfterViewInit(): void {
        this.viewInit = true;

        super.ngAfterViewInit();
    }

    /**
     * Add a new tab if it isn't already in the list of tabs.
     *
     * @param {CoreIonTabComponent} tab The tab to add.
     * @param {boolean} [isInit] Whether the tab has been initialized.
     * @return {string} The tab ID.
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
     * @return {Promise<any>} Promise resolved when done.
     */
    initTabs(): Promise<any> {
        if (!this.initialized && (this._loaded || typeof this._loaded == 'undefined')) {
            this.initialized = true;

            return super.initTabs().then(() => {
                // Tabs initialized. Force select the tab if it's not enabled.
                if (this.selectedDisabled && typeof this.selectedIndex != 'undefined') {
                    const tab = this.getByIndex(this.selectedIndex);

                    if (tab && (!tab.enabled || !tab.show)) {
                        this.select(tab);
                    }
                }
            });
        } else {
            // Tabs not loaded yet. Set the tab bar position so the tab bar is shown, it'll have a spinner.
            this.setTabbarPosition(-1, 0);

            return Promise.resolve();
        }
    }

    /**
     * Remove a tab from the list of tabs.
     *
     * @param {CoreIonTabComponent} tab The tab to remove.
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
}
