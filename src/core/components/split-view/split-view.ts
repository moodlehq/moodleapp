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

import { AfterViewInit, Component, ElementRef, HostBinding, Input, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { IonRouterOutlet } from '@ionic/angular';
import { CoreScreen } from '@services/screen';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export enum CoreSplitViewMode {
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
    @Input() placeholderText = 'core.emptysplit';
    @Input() mode?: CoreSplitViewMode;
    isNested = false;

    private outletRouteSubject: BehaviorSubject<ActivatedRouteSnapshot | null> = new BehaviorSubject(null);
    private subscriptions?: Subscription[];

    constructor(private element: ElementRef<HTMLElement>) {}

    get outletRoute(): ActivatedRouteSnapshot | null {
        return this.outletRouteSubject.value;
    }

    get outletRouteObservable(): Observable<ActivatedRouteSnapshot | null> {
        return this.outletRouteSubject.asObservable();
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.isNested = !!this.element.nativeElement.parentElement?.closest('core-split-view');
        this.subscriptions = [
            this.outlet.activateEvents.subscribe(() => {
                this.updateClasses();
                this.outletRouteSubject.next(this.outlet.activatedRoute.snapshot);
            }),
            this.outlet.deactivateEvents.subscribe(() => {
                this.updateClasses();
                this.outletRouteSubject.next(null);
            }),
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

        if (this.outlet.isActivated) {
            classes.push('outlet-activated');
        }

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
        if (this.mode) {
            return this.mode;
        }

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

    /**
     * Check if both panels are shown. It depends on screen width.
     *
     * @return If split view is enabled.
     */
    isOn(): boolean {
        return this.outlet.isActivated;
    }

}
