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

import {
    Component, Optional, ElementRef, NgZone, Renderer, ComponentFactoryResolver, ChangeDetectorRef, ErrorHandler, OnInit,
    OnDestroy, ViewEncapsulation
} from '@angular/core';
import { Tab, App, Config, Platform, GestureController, DeepLinker, DomController, NavOptions } from 'ionic-angular';
import { TransitionController } from 'ionic-angular/transitions/transition-controller';
import { CoreIonTabsComponent } from './ion-tabs';
import { TransitionDoneFn } from 'ionic-angular/navigation/nav-util';

/**
 * Equivalent to ion-tab, but to be used inside core-ion-tabs.
 */
@Component({
    selector: 'core-ion-tab',
    template: '<div #viewport></div><div class="nav-decor"></div>',
    host: {
        '[attr.id]': '_tabId',
        '[attr.aria-labelledby]': '_btnId',
        'role': 'tabpanel'
    },
    encapsulation: ViewEncapsulation.None,
})
export class CoreIonTabComponent extends Tab implements OnInit, OnDestroy {

    constructor(parent: CoreIonTabsComponent, app: App, config: Config, plt: Platform, elementRef: ElementRef, zone: NgZone,
            renderer: Renderer, cfr: ComponentFactoryResolver, _cd: ChangeDetectorRef, gestureCtrl: GestureController,
            transCtrl: TransitionController, @Optional() linker: DeepLinker, _dom: DomController, errHandler: ErrorHandler) {
        super(parent, app, config, plt, elementRef, zone, renderer, cfr, _cd, gestureCtrl, transCtrl, linker, _dom, errHandler);
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        super.ngOnInit();

        this.parent.add(this, true);
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        super.ngOnDestroy();

        this.parent.remove(this);
    }

    /**
     * Push a page to the navigation stack. this similar to parent NavController, but perform some check to make
     * sure one page won't open multiple time.
     */
    push(page: any, params?: any, opts?: NavOptions, done?: TransitionDoneFn): Promise<any> {
        if (this.isTransitioning()) {
            // Try again later, the app is transitioning, this also happen when the page is first loaded.
            return new Promise<any>((resolve, reject): void => {
                setTimeout(() => {

                    return this.push(page, params, opts, done).then(resolve, reject);
                }, 250);
            });
        } else {
            const previousViews = this.getViews();
            if (previousViews.length > 0) {
                const previousView = previousViews[previousViews.length - 1];
                const previousParam = previousView.getNavParams().data;

                // If the view we pushing in have same page's name and identical params, then we won't do anything.
                // This is Ionic issue when user clicking too fast on old device or slow internet connection.
                if (previousView.name === page && JSON.stringify(previousParam) === JSON.stringify(params)) {

                    return Promise.resolve();
                }
            }

            return super.push(page, params, opts, done);
        }
    }
}
