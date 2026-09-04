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
import { ConnectionStatus, Network } from '@capacitor/network';
import { makeSingleton } from '@singletons';
import { Observable, Subject, merge } from 'rxjs';
import { CoreHTMLClasses } from '@static/html-classes';

export enum CoreNetworkConnectionType {
    UNKNOWN = 'unknown', // Considered online.
    WIFI = 'wifi', // Usually a non-metered connection.
    CELL = 'cellular', // Usually a metered connection.
    OFFLINE = 'none',
}

/**
 * Service to manage network connections.
 */
@Injectable({ providedIn: 'root' })
export class CoreNetworkService {

    /**
     * @deprecated Use `connectionType` instead. Type changed grouping CELL_* on CELL and ETHERNET on UNKNOWN.
     */
    type = CoreNetworkConnectionType.UNKNOWN;

    protected connectObservable = new Subject<'connected'>();
    protected connectStableObservable = new Subject<'connected'>();
    protected disconnectObservable = new Subject<'disconnected'>();
    protected forceConnectionMode?: CoreNetworkConnectionType;
    protected connectStableTimeout?: number;
    protected readonly online = computed(() => this._connectionType() !== CoreNetworkConnectionType.OFFLINE);
    private readonly _connectionType = signal(CoreNetworkConnectionType.UNKNOWN);
    protected readonly cellularSignal = computed<boolean>(() => this.connectionTypeSignal() === CoreNetworkConnectionType.CELL);
    protected readonly wifiSignal = computed<boolean>(() => this.connectionTypeSignal() === CoreNetworkConnectionType.WIFI);
    protected fireObservable = false;

    constructor() {

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

        effect(() => {
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            this.type = this._connectionType();
        });

        // Fire observable when type or online status change.
        effect(() => {
            void this._connectionType();
            const online = this.online();
            if (!this.fireObservable) {
                return;
            }

            clearTimeout(this.connectStableTimeout);

            if (online) {
                this.connectObservable.next('connected');
                this.connectStableTimeout = window.setTimeout(() => {
                    this.connectStableObservable.next('connected');
                }, 5000);
            } else {
                this.disconnectObservable.next('disconnected');
            }
        });
    }

    get connectionType(): CoreNetworkConnectionType {
        return this._connectionType();
    }

    /**
     * Initialize the service.
     */
    async initialize(): Promise<void> {
        try {
            const status = await Network.getStatus();
            this.updateConnectionType(status);

            await Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
                this.fireObservable = true; // Do not fire observable if it changes during startup.
                this.updateConnectionType(status);
            });
        } catch {
            // Ignore errors.
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
        this.fireObservable = true;
        this.forceConnectionMode = value;
        this.updateConnectionType();
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
     * Check and update the connection type.
     *
     * @param status Connection status.
     */
    protected updateConnectionType(status?: ConnectionStatus): void {
        if (this.forceConnectionMode !== undefined) {
            this._connectionType.set(this.forceConnectionMode);

            return;
        }

        if (status?.connected === false) {
            this._connectionType.set(CoreNetworkConnectionType.OFFLINE);

            return;
        }

        const type = status?.connectionType as CoreNetworkConnectionType ?? this._connectionType();

        this._connectionType.set(type);
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
    get onlineSignal(): Signal<boolean> {
        return this.online;
    }

    /**
     * Returns a signal to watch connection type.
     *
     * @returns Signal.
     */
    get connectionTypeSignal(): Signal<CoreNetworkConnectionType> {
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
        return this.wifiSignal();
    }

    /**
     * Check if device uses a limited connection.
     *
     * @returns Whether the device uses a limited connection.
     */
    isCellular(): boolean {
        return this.cellularSignal();
    }

    /**
     * Returns a signal to watch if the device uses a cellular connection.
     *
     * @returns Signal.
     */
    get isCellularSignal(): Signal<boolean> {
        return this.cellularSignal;
    }

    /**
     * Returns a signal to watch if the device uses a wifi connection.
     *
     * @returns Signal.
     */
    get isWifiSignal(): Signal<boolean> {
        return this.wifiSignal;
    }

}

export const CoreNetwork = makeSingleton(CoreNetworkService);
