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

import { AfterViewInit, Component, ElementRef, HostBinding, OnDestroy, ViewChild } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular';
import { CoreScreen } from '@services/screen';
import { Subscription } from 'rxjs';

enum CoreSplitViewMode {
    MenuOnly = 'menu-only', // Hides content.
    ContentOnly = 'content-only', // Hides menu.
    MenuAndContent = 'menu-and-content', // Shows both menu and content.
}

@Component({
    selector: 'core-split-view',
    templateUrl: 'split-view.html',
    styleUrls: ['split-view.scss'],
})
export class CoreSplitViewComponent implements AfterViewInit, OnDestroy {

    @ViewChild(IonRouterOutlet) outlet!: IonRouterOutlet;
    @HostBinding('class') classes = '';
    isNested = false;

    private subscriptions?: Subscription[];

    constructor(private element: ElementRef<HTMLElement>) {}

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.isNested = !!this.element.nativeElement.parentElement?.closest('core-split-view');
        this.subscriptions = [
            this.outlet.activateEvents.subscribe(() => this.updateClasses()),
            this.outlet.deactivateEvents.subscribe(() => this.updateClasses()),
            CoreScreen.instance.layoutObservable.subscribe(() => this.updateClasses()),
        ];

        this.updateClasses();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscriptions?.forEach(subscription => subscription.unsubscribe());
    }

    /**
     * Update host classes.
     */
    private updateClasses(): void {
        const classes: string[] = [this.getCurrentMode()];

        if (this.isNested) {
            classes.push('nested');
        }

        this.classes = classes.join(' ');
    }

    /**
     * Get the current mode. Depending on the layout, outlet status, and whether this split view
     * is nested or not, this method will indicate which parts of the split view should be visible.
     *
     * @return Split view mode.
     */
    private getCurrentMode(): CoreSplitViewMode {
        if (this.isNested) {
            return CoreSplitViewMode.MenuOnly;
        }

        if (CoreScreen.instance.isMobile) {
            return this.outlet.isActivated
                ? CoreSplitViewMode.ContentOnly
                : CoreSplitViewMode.MenuOnly;
        }

        return CoreSplitViewMode.MenuAndContent;
    }

}
