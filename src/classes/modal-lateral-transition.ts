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

import { Animation } from 'ionic-angular/animations/animation';
import { PageTransition } from 'ionic-angular/transitions/page-transition';

/**
 * Sliding transition for lateral modals.
 */
export class CoreModalLateralTransition extends PageTransition {
    /**
     * Animation.
     */
    init(): void {
        const enteringView = this.enteringView;
        const leavingView = this.leavingView;

        const plt = this.plt;
        const OFF_RIGHT = plt.isRTL ? '-100%' : '100%';

        if (enteringView && enteringView.pageRef()) {
            const ele = enteringView.pageRef().nativeElement;
            const wrapper = new Animation(this.plt, ele.querySelector('.modal-wrapper'));
            const backdrop = new Animation(this.plt, ele.querySelector('ion-backdrop'));

            wrapper.beforeStyles({ transform: 'translateX(' + OFF_RIGHT + ')', opacity: 0.8 });
            wrapper.fromTo('transform', 'translateX(' + OFF_RIGHT + ')', 'translateX(0)');
            wrapper.fromTo('opacity', 0.8, 1);
            backdrop.fromTo('opacity', 0.01, 0.4);

            this
                .element(enteringView.pageRef())
                .duration(300)
                .easing('cubic-bezier(0.36,0.66,0.04,1)')
                .add(wrapper)
                .add(backdrop);
        }

        if (leavingView && leavingView.pageRef()) {
            const ele = this.leavingView.pageRef().nativeElement;
            const wrapper = new Animation(this.plt, ele.querySelector('.modal-wrapper'));
            const contentWrapper = new Animation(this.plt, ele.querySelector('.wrapper'));
            const backdrop = new Animation(this.plt, ele.querySelector('ion-backdrop'));

            wrapper.beforeStyles({ transform: 'translateX(0)', opacity: 1 });
            wrapper.fromTo('transform', 'translateX(0)', 'translateX(' + OFF_RIGHT + ')');
            wrapper.fromTo('opacity', 1, 0.8);
            contentWrapper.fromTo('opacity', 1, 0);
            backdrop.fromTo('opacity', 0.4, 0);

            this
                .element(leavingView.pageRef())
                .duration(300)
                .easing('cubic-bezier(0.36,0.66,0.04,1)')
                .add(contentWrapper)
                .add(wrapper)
                .add(backdrop);

        }
    }
}
