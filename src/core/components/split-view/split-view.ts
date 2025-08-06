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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { IonContent, IonRouterOutlet } from '@ionic/angular';
import { CoreScreen } from '@services/screen';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { CoreBaseModule } from '@/core/base.module';
import { CoreEmptyBoxComponent } from '../empty-box/empty-box';
import { CoreContentDirective } from '@directives/content';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';

export enum CoreSplitViewMode {
    MENU_ONLY = 'menu-only', // Hides content.
    CONTENT_ONLY = 'content-only', // Hides menu.
    MENU_AND_CONTENT = 'menu-and-content', // Shows both menu and content.
}

const disabledScrollClass = 'disable-scroll-y';

@Component({
    selector: 'core-split-view',
    templateUrl: 'split-view.html',
    styleUrl: 'split-view.scss',
    imports: [
        CoreBaseModule,
        CoreEmptyBoxComponent,
        CoreContentDirective,
    ],
})
export class CoreSplitViewComponent implements AfterViewInit, OnDestroy {

    @ViewChild(IonContent) menuContent!: IonContent;
    @ViewChild(IonRouterOutlet) contentOutlet!: IonRouterOutlet;
    @Input() placeholderText = 'core.emptysplit';
    @Input() mode?: CoreSplitViewMode;
    isNested = false;
    disabledScrollOuterContents: HTMLIonContentElement[] = [];

    private outletRouteSubject = new BehaviorSubject<ActivatedRouteSnapshot | null>(null);
    private subscriptions?: Subscription[];
    protected element: HTMLElement = inject(ElementRef).nativeElement;

    constructor() {
        CoreDirectivesRegistry.register(this.element, this);
    }

    get outletRoute(): ActivatedRouteSnapshot | null {
        return this.outletRouteSubject.value;
    }

    get outletActivated(): boolean {
        return this.contentOutlet.isActivated;
    }

    get outletRouteObservable(): Observable<ActivatedRouteSnapshot | null> {
        return this.outletRouteSubject.asObservable();
    }

    get nativeElement(): HTMLElement {
        return this.element;
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.isNested = !!this.element.parentElement?.closest('core-split-view');

        this.disableScrollOnParent();

        this.subscriptions = [
            this.contentOutlet.activateEvents.subscribe(() => this.updateOutletRoute()),
            this.contentOutlet.deactivateEvents.subscribe(() => this.updateOutletRoute()),
            CoreScreen.layoutObservable.subscribe(() => this.updateClasses()),
        ];

        this.updateClasses();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscriptions?.forEach(subscription => subscription.unsubscribe());

        this.enableScrollOnParent();
    }

    /**
     * Update outlet status.
     */
    private updateOutletRoute(): void {
        const outletRoute = this.contentOutlet.isActivated ? this.contentOutlet.activatedRoute.snapshot : null;

        this.updateClasses();

        this.outletRouteSubject.next(outletRoute ?? null);
    }

    /**
     * Update host classes.
     */
    private updateClasses(): void {
        const classes: string[] = [this.getCurrentMode()];

        if (this.contentOutlet.isActivated) {
            classes.push('outlet-activated');
        }

        if (this.isNested) {
            classes.push('nested');
        }

        this.element.setAttribute('class', classes.join(' '));
    }

    /**
     * Get the current mode. Depending on the layout, outlet status, and whether this split view
     * is nested or not, this method will indicate which parts of the split view should be visible.
     *
     * @returns Split view mode.
     */
    private getCurrentMode(): CoreSplitViewMode {
        if (this.mode) {
            return this.mode;
        }

        if (this.isNested) {
            return CoreSplitViewMode.MENU_ONLY;
        }

        if (CoreScreen.isMobile) {
            return this.contentOutlet.isActivated
                ? CoreSplitViewMode.CONTENT_ONLY
                : CoreSplitViewMode.MENU_ONLY;
        }

        return CoreSplitViewMode.MENU_AND_CONTENT;
    }

    /**
     * Will disable scroll on parent ion contents to enabled PTR on the ones inside the splitview.
     * This error only happens on iOS.
     * Another manual solution is to add scroll-y=false on the ion-contents outside the split view.
     */
    protected disableScrollOnParent(): void {
        const outerContent = this.element.parentElement?.closest('ion-content');
        if (outerContent) {
            if (outerContent?.getAttribute('scroll-y') != 'false' && !outerContent?.classList.contains(disabledScrollClass)) {
                outerContent.classList.add(disabledScrollClass);
                this.disabledScrollOuterContents.push(outerContent);
            }
        }
    }

    /**
     * Will enable scroll on parent ion contents previouly disabled.
     */
    protected enableScrollOnParent(): void {
        this.disabledScrollOuterContents.forEach((outerContent) => {
            outerContent.classList.remove(disabledScrollClass);
        });
    }

}
