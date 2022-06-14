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

import { Injectable } from '@angular/core';
import { CorePlatform } from '@services/platform';
import { Network as NetworkService } from '@ionic-native/network/ngx';
import { makeSingleton } from '@singletons';
import { Observable, Subject, merge } from 'rxjs';

const Network = makeSingleton(NetworkService);

/**
 * Service to manage network connections.
 */
@Injectable({ providedIn: 'root' })
export class CoreNetworkService extends NetworkService {

    type!: string;

    protected connectObservable = new Subject<'connected'>();
    protected disconnectObservable = new Subject<'disconnected'>();
    protected forceOffline = false;
    protected online = false;

    constructor() {
        super();

        this.checkOnline();

        if (CorePlatform.isMobile()) {
            Network.onChange().subscribe(() => {
                this.fireObservable();
            });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (<any> window).Connection = {
                UNKNOWN: 'unknown', // eslint-disable-line @typescript-eslint/naming-convention
                ETHERNET: 'ethernet', // eslint-disable-line @typescript-eslint/naming-convention
                WIFI: 'wifi', // eslint-disable-line @typescript-eslint/naming-convention
                CELL_2G: '2g', // eslint-disable-line @typescript-eslint/naming-convention
                CELL_3G: '3g', // eslint-disable-line @typescript-eslint/naming-convention
                CELL_4G: '4g', // eslint-disable-line @typescript-eslint/naming-convention
                CELL: 'cellular', // eslint-disable-line @typescript-eslint/naming-convention
                NONE: 'none', // eslint-disable-line @typescript-eslint/naming-convention
            };

            window.addEventListener('online', () => {
                this.fireObservable();
            }, false);

            window.addEventListener('offline', () => {
                this.fireObservable();
            }, false);
        }
    }

    /**
     * Set value of forceOffline flag. If true, the app will think the device is offline.
     *
     * @param value Value to set.
     */
    setForceOffline(value: boolean): void {
        this.forceOffline = !!value;
        this.fireObservable();
    }

    /**
     * Returns whether we are online.
     *
     * @return Whether the app is online.
     */
    isOnline(): boolean {
        return this.online;
    }

    /**
     * Returns whether we are online.
     *
     * @return Whether the app is online.
     */
    checkOnline(): void {
        if (this.forceOffline) {
            this.online = false;

            return;
        }

        if (!CorePlatform.isMobile()) {
            this.online = navigator.onLine;

            return;
        }

        let online = this.type !== null && this.type != this.Connection.NONE &&
            this.type != this.Connection.UNKNOWN;

        // Double check we are not online because we cannot rely 100% in Cordova APIs.
        if (!online && navigator.onLine) {
            online = true;
        }

        this.online = online;
    }

    /**
     * Returns an observable to watch connection changes.
     *
     * @return Observable.
     */
    onChange(): Observable<'connected' | 'disconnected'> {
        return merge(this.connectObservable, this.disconnectObservable);
    }

    /**
     * Returns an observable to notify when the app is connected.
     *
     * @return Observable.
     */
    onConnect(): Observable<'connected'> {
        return this.connectObservable;
    }

    /**
     * Returns an observable to notify when the app is disconnected.
     *
     * @return Observable.
     */
    onDisconnect(): Observable<'disconnected'> {
        return this.disconnectObservable;
    }

    /**
     * Fires the correct observable depending on the connection status.
     */
    protected fireObservable(): void {
        const previousOnline = this.online;

        this.checkOnline();
        if (this.online && !previousOnline) {
            this.connectObservable.next('connected');
        } else if (!this.online && previousOnline) {
            this.disconnectObservable.next('disconnected');
        }
    }

    /**
     * Check if device uses a limited connection.
     *
     * @return Whether the device uses a limited connection.
     */
    isNetworkAccessLimited(): boolean {
        if (!CorePlatform.isMobile()) {
            return false;
        }

        const limited = [
            Network.Connection.CELL_2G,
            Network.Connection.CELL_3G,
            Network.Connection.CELL_4G,
            Network.Connection.CELL,
        ];

        return limited.indexOf(Network.type) > -1;
    }

    /**
     * Check if device uses a wifi connection.
     *
     * @return Whether the device uses a wifi connection.
     */
    isWifi(): boolean {
        return this.isOnline() && !this.isNetworkAccessLimited();
    }

}

export const CoreNetwork = makeSingleton(CoreNetworkService);
