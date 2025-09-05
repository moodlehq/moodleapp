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

import { computed, effect, Injectable, Signal, signal } from '@angular/core';
import { CorePlatform } from '@services/platform';
import { Network } from '@awesome-cordova-plugins/network/ngx';
import { makeSingleton } from '@singletons';
import { Observable, Subject, merge } from 'rxjs';
import { CoreHTMLClasses } from '@singletons/html-classes';

enum CoreNetworkConnection {
    UNKNOWN = 'unknown',
    ETHERNET = 'ethernet',
    WIFI = 'wifi',
    CELL_2G = '2g',
    CELL_3G = '3g',
    CELL_4G = '4g',
    CELL = 'cellular',
    NONE = 'none',
}

export enum CoreNetworkConnectionType {
    UNKNOWN = 'unknown',
    WIFI = 'wifi', // Usually a non-metered connection.
    CELL = 'cellular', // Usually a metered connection.
    OFFLINE = 'offline',
}

/**
 * Service to manage network connections.
 */
@Injectable({ providedIn: 'root' })
export class CoreNetworkService extends Network {

    type!: string;

    protected connectObservable = new Subject<'connected'>();
    protected connectStableObservable = new Subject<'connected'>();
    protected disconnectObservable = new Subject<'disconnected'>();
    protected forceConnectionMode?: CoreNetworkConnectionType;
    protected connectStableTimeout?: number;
    protected readonly online = signal(false);
    private readonly _connectionType = signal(CoreNetworkConnectionType.UNKNOWN);

    constructor() {
        super();

        effect(() => {
            const isOnline = this.online();

            const hadOfflineMessage = CoreHTMLClasses.hasModeClass('core-offline');

            CoreHTMLClasses.toggleModeClass('core-offline', !isOnline);

            if (isOnline && hadOfflineMessage) {
                CoreHTMLClasses.toggleModeClass('core-online', true);

                setTimeout(() => {
                    CoreHTMLClasses.toggleModeClass('core-online', false);
                }, 3000);
            } else if (!isOnline) {
                CoreHTMLClasses.toggleModeClass('core-online', false);
            }
        });
    }

    get connectionType(): CoreNetworkConnectionType {
        CoreNetwork.updateConnectionType();

        return this._connectionType();
    }

    /**
     * Initialize the service.
     */
    initialize(): void {
        this.updateOnline();

        if (CorePlatform.isMobile()) {
            // We cannot directly listen to onChange because it depends on
            // onConnect and onDisconnect that have been already overriden.
            super.onConnect().subscribe(() => {
                this.fireObservable();
            });
            super.onDisconnect().subscribe(() => {
                this.fireObservable();
            });
        } else {
            // Match the Cordova constants to the ones used in the app.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any> window).Connection = {
                UNKNOWN: CoreNetworkConnection.UNKNOWN, // eslint-disable-line @typescript-eslint/naming-convention
                ETHERNET: CoreNetworkConnection.ETHERNET, // eslint-disable-line @typescript-eslint/naming-convention
                WIFI: CoreNetworkConnection.WIFI, // eslint-disable-line @typescript-eslint/naming-convention
                CELL_2G: CoreNetworkConnection.CELL_2G, // eslint-disable-line @typescript-eslint/naming-convention
                CELL_3G: CoreNetworkConnection.CELL_3G, // eslint-disable-line @typescript-eslint/naming-convention
                CELL_4G: CoreNetworkConnection.CELL_4G, // eslint-disable-line @typescript-eslint/naming-convention
                CELL: CoreNetworkConnection.CELL, // eslint-disable-line @typescript-eslint/naming-convention
                NONE: CoreNetworkConnection.NONE, // eslint-disable-line @typescript-eslint/naming-convention
            };

            window.addEventListener('online', () => {
                this.fireObservable();
            }, false);

            window.addEventListener('offline', () => {
                this.fireObservable();
            }, false);
        }

        this.onPlaformReady();
    }

    /**
     * Initialize the service when the platform is ready.
     */
    async onPlaformReady(): Promise<void> {
        await CorePlatform.ready();

        CoreHTMLClasses.toggleModeClass('core-offline', !this.online());
    }

    /**
     * Set value of forceConnectionMode flag.
     * The app will think the device is offline or limited connection.
     *
     * @param value Value to set.
     */
    setForceConnectionMode(value: CoreNetworkConnectionType): void {
        this.forceConnectionMode = value;
        this.fireObservable();
    }

    /**
     * Returns whether we are online.
     *
     * @returns Whether the app is online.
     */
    isOnline(): boolean {
        return this.online();
    }

    /**
     * Updates online status.
     */
    protected updateOnline(): void {
        // Recalculate connection type.
        CoreNetwork.updateConnectionType();

        if (this.forceConnectionMode === CoreNetworkConnectionType.OFFLINE) {
            this.online.set(false);

            return;
        }

        // We cannot use navigator.onLine because it has issues in some devices.
        // See https://bugs.chromium.org/p/chromium/issues/detail?id=811122
        if (!CorePlatform.isAndroid()) {
            this.online.set(navigator.onLine);

            return;
        }

        const type = this._connectionType();
        let online = type !== null && type !== CoreNetworkConnectionType.OFFLINE && type !== CoreNetworkConnectionType.UNKNOWN;

        // Double check we are not online because we cannot rely 100% in Cordova APIs.
        if (!online && navigator.onLine) {
            online = true;
        }

        this.online.set(online);
    }

    /**
     * Check and update the connection type.
     */
    protected updateConnectionType(): void {
        if (this.forceConnectionMode !== undefined) {
            this._connectionType.set(this.forceConnectionMode);

            return;
        }

        if (CorePlatform.isMobile()) {
            switch (this.type) {
                case CoreNetworkConnection.WIFI:
                case CoreNetworkConnection.ETHERNET:
                    this._connectionType.set(CoreNetworkConnectionType.WIFI);

                    return;
                case CoreNetworkConnection.CELL:
                case CoreNetworkConnection.CELL_2G:
                case CoreNetworkConnection.CELL_3G:
                case CoreNetworkConnection.CELL_4G:
                    this._connectionType.set(CoreNetworkConnectionType.CELL);

                    return;
                case CoreNetworkConnection.NONE:
                    this._connectionType.set(CoreNetworkConnectionType.OFFLINE);

                    return;
                default:
                case CoreNetworkConnection.UNKNOWN:
                    this._connectionType.set(CoreNetworkConnectionType.UNKNOWN);

                    return;
            }
        }

        this._connectionType.set(this.online() ? CoreNetworkConnectionType.WIFI : CoreNetworkConnectionType.OFFLINE);
    }

    /**
     * Returns an observable to watch connection changes.
     *
     * @returns Observable.
     */
    onChange(): Observable<'connected' | 'disconnected'> {
        return merge(this.connectObservable, this.disconnectObservable);
    }

    /**
     * Returns a signal to watch online status.
     *
     * @returns Signal.
     */
    onlineSignal(): Signal<boolean> {
        return this.online.asReadonly();
    }

    /**
     * Returns a signal to watch connection type.
     *
     * @returns Signal.
     */
    connectionTypeSignal(): Signal<CoreNetworkConnectionType> {
        return this._connectionType.asReadonly();
    }

    /**
     * Returns an observable to notify when the app is connected.
     * It will also be fired when connection type changes.
     * If you're going to perform network requests once the device is connected, please use onConnectShouldBeStable instead.
     *
     * @returns Observable.
     */
    onConnect(): Observable<'connected'> {
        return this.connectObservable;
    }

    /**
     * Returns an observable to notify when the app is connected and it should already be a stable a connection.
     * E.g. when leaving flight mode the device could connect to mobile network first and then to WiFi.
     * If you're going to perform network requests once the device is connected, it's recommended to use this function instead of
     * onConnect because some OS (e.g. Android) duplicate a request if the type of connection changes while the request is done.
     *
     * @returns Observable.
     */
    onConnectShouldBeStable(): Observable<'connected'> {
        return this.connectStableObservable;
    }

    /**
     * Returns an observable to notify when the app is disconnected.
     *
     * @returns Observable.
     */
    onDisconnect(): Observable<'disconnected'> {
        return this.disconnectObservable;
    }

    /**
     * Fires the correct observable depending on the connection status.
     */
    protected fireObservable(): void {
        clearTimeout(this.connectStableTimeout);
        this.updateOnline();

        if (this.online()) {
            this.connectObservable.next('connected');
            this.connectStableTimeout = window.setTimeout(() => {
                this.connectStableObservable.next('connected');
            }, 5000);
        } else {
            this.disconnectObservable.next('disconnected');
        }
    }

    /**
     * Check if device uses a limited connection.
     *
     * @returns Whether the device uses a limited connection.
     * @deprecated since 5.1. Use isCellular instead.
     */
    isNetworkAccessLimited(): boolean {
        return this.isCellular();
    }

    /**
     * Check if device uses a wifi connection.
     *
     * @returns Whether the device uses a wifi connection.
     */
    isWifi(): boolean {
        return this.connectionType === CoreNetworkConnectionType.WIFI;
    }

    /**
     * Check if device uses a limited connection.
     *
     * @returns Whether the device uses a limited connection.
     */
    isCellular(): boolean {
        return this.connectionType === CoreNetworkConnectionType.CELL;
    }

    /**
     * Returns a signal to watch if the device uses a cellular connection.
     *
     * @returns Signal.
     */
    isCellularSignal(): Signal<boolean> {
        return computed<boolean>(() => this.connectionTypeSignal()() === CoreNetworkConnectionType.CELL);
    }

    /**
     * Returns a signal to watch if the device uses a wifi connection.
     *
     * @returns Signal.
     */
    isWifiSignal(): Signal<boolean> {
        return computed<boolean>(() => this.connectionTypeSignal()() === CoreNetworkConnectionType.WIFI);
    }

}

export const CoreNetwork = makeSingleton(CoreNetworkService);
