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

import { Injectable, Signal, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { makeSingleton, StatusBar } from '@singletons';
import { CoreEvents } from '@singletons/events';
import { CorePlatform } from '@services/platform';

/**
 * Screen breakpoints.
 *
 * @see https://ionicframework.com/docs/layout/grid#default-breakpoints
 */
enum Breakpoint {
    EXTRA_SMALL = 'xs',
    SMALL = 'sm',
    MEDIUM = 'md',
    LARGE = 'lg',
    EXTRA_LARGE = 'xl',
}

const BREAKPOINT_NAMES = Object.values(Breakpoint);
const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
    [Breakpoint.EXTRA_SMALL]: 0,
    [Breakpoint.SMALL]: 576,
    [Breakpoint.MEDIUM]: 768,
    [Breakpoint.LARGE]: 992,
    [Breakpoint.EXTRA_LARGE]: 1200,
};

/**
 * Screen layouts.
 */
export enum CoreScreenLayout {
    MOBILE = 'mobile',
    TABLET = 'tablet',
}

/**
 * Screen orientation.
 */
export enum CoreScreenOrientation {
    LANDSCAPE = 'landscape',
    PORTRAIT = 'portrait',
}

/**
 * Manage application screen.
 */
@Injectable({ providedIn: 'root' })
export class CoreScreenService {

    protected breakpointsSubject: BehaviorSubject<Record<Breakpoint, boolean>>;
    private _layoutObservable: Observable<CoreScreenLayout>;
    private readonly _orientationSignal = signal<CoreScreenOrientation>(CoreScreenOrientation.PORTRAIT);

    constructor() {
        this.breakpointsSubject = new BehaviorSubject(BREAKPOINT_NAMES.reduce((breakpoints, breakpoint) => ({
            ...breakpoints,
            [breakpoint]: false,
        }), {} as Record<Breakpoint, boolean>));

        this._layoutObservable = this.breakpointsObservable.pipe(
            map(breakpoints => this.calculateLayout(breakpoints)),
            distinctUntilChanged<CoreScreenLayout>(),
        );

        this.initializeOrientation();
    }

    get breakpoints(): Record<Breakpoint, boolean> {
        return this.breakpointsSubject.value;
    }

    get breakpointsObservable(): Observable<Record<Breakpoint, boolean>> {
        return this.breakpointsSubject.asObservable();
    }

    get layout(): CoreScreenLayout {
        return this.calculateLayout(this.breakpointsSubject.value);
    }

    get layoutObservable(): Observable<CoreScreenLayout> {
        return this._layoutObservable;
    }

    get isMobile(): boolean {
        return this.layout === CoreScreenLayout.MOBILE;
    }

    get isTablet(): boolean {
        return this.layout === CoreScreenLayout.TABLET;
    }

    get orientation(): CoreScreenOrientation {
        if (!this.orientationDataExists()) {
            // Not initialized yet, assume portrait.
            return CoreScreenOrientation.PORTRAIT;
        }

        return screen.orientation.type?.startsWith(CoreScreenOrientation.LANDSCAPE)
            ? CoreScreenOrientation.LANDSCAPE
            : CoreScreenOrientation.PORTRAIT;
    }

    get orientationSignal(): Signal<CoreScreenOrientation> {
        return this._orientationSignal.asReadonly();
    }

    get isPortrait(): boolean {
        return this.orientation === CoreScreenOrientation.PORTRAIT;
    }

    get isLandscape(): boolean {
        return this.orientation === CoreScreenOrientation.LANDSCAPE;
    }

    /**
     * Watch orientation changes.
     */
    async watchOrientation(): Promise<void> {
        await CorePlatform.ready();

        screen.orientation.addEventListener('change', () => {
            const orientation = this.orientation;
            this._orientationSignal.set(orientation);

            // eslint-disable-next-line @typescript-eslint/no-deprecated
            CoreEvents.trigger(CoreEvents.ORIENTATION_CHANGE, { orientation });
        });
    }

    /**
     * Watch fullscreen changes.
     */
    async watchFullscreen(): Promise<void> {
        await CorePlatform.ready();

        // During video playback, Android 11 and previous versions show the status bar on the first click.
        // We're not hiding the status bar in this case to avoid this issue.
        if (CorePlatform.isAndroid() && CorePlatform.getPlatformMajorVersion() < 12) {
            return;
        }

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                StatusBar.hide();
            } else {
                StatusBar.show();
            }
        });
    }

    /**
     * Watch viewport changes.
     */
    watchViewport(): void {
        for (const breakpoint of BREAKPOINT_NAMES) {
            const width = BREAKPOINT_WIDTHS[breakpoint];
            const mediaQuery = window.matchMedia(`(min-width: ${width}px)`);

            this.updateBreakpointVisibility(breakpoint, mediaQuery.matches);

            mediaQuery.onchange = (({ matches }) => this.updateBreakpointVisibility(breakpoint, matches));
        }
    }

    /**
     * Update breakpoint visibility.
     *
     * @param breakpoint Breakpoint.
     * @param visible Visible.
     */
    protected updateBreakpointVisibility(breakpoint: Breakpoint, visible: boolean): void {
        if (this.breakpoints[breakpoint] === visible) {
            return;
        }

        this.breakpointsSubject.next({
            ...this.breakpoints,
            [breakpoint]: visible,
        });
    }

    /**
     * Calculate the layout given the current breakpoints.
     *
     * @param breakpoints Breakpoints visibility.
     * @returns Active layout.
     */
    protected calculateLayout(breakpoints: Record<Breakpoint, boolean>): CoreScreenLayout {
        if (breakpoints[Breakpoint.MEDIUM]) {
            return CoreScreenLayout.TABLET;
        }

        return CoreScreenLayout.MOBILE;
    }

    /**
     * Initialize the orientation signal value.
     */
    protected async initializeOrientation(): Promise<void> {
        await CorePlatform.ready();

        this._orientationSignal.set(this.orientation);
    }

    /**
     * Check if the orientation data exists.
     *
     * @returns Whether the orientation data exists.
     */
    protected orientationDataExists(): boolean {
        return !!screen?.orientation;
    }

}

export const CoreScreen = makeSingleton(CoreScreenService);
