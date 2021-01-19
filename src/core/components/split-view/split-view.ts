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

import { AfterViewInit, Component, HostBinding, OnDestroy, ViewChild } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
    selector: 'core-split-view',
    templateUrl: 'split-view.html',
    styleUrls: ['split-view.scss'],
})
export class CoreSplitViewComponent implements AfterViewInit, OnDestroy {

    @ViewChild(IonRouterOutlet) outlet!: IonRouterOutlet;
    @HostBinding('class.outlet-activated') outletActivated = false;

    private subscriptions?: Subscription[];

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.outletActivated = this.outlet.isActivated;
        this.subscriptions = [
            this.outlet.activateEvents.subscribe(() => this.outletActivated = true),
            this.outlet.deactivateEvents.subscribe(() => this.outletActivated = false),
        ];
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscriptions?.forEach(subscription => subscription.unsubscribe());
    }

}
