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
import { Network } from '@ionic-native/network/ngx';
import { Observable, Subject, merge } from 'rxjs';

/**
 * Emulates the Cordova Network plugin in browser.
 */
@Injectable()
export class NetworkMock extends Network {

    type!: string;

    protected connectObservable = new Subject<'connected'>();
    protected disconnectObservable = new Subject<'disconnected'>();

    constructor() {
        super();

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
            this.connectObservable.next('connected');
        }, false);

        window.addEventListener('offline', () => {
            this.disconnectObservable.next('disconnected');
        }, false);
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

}
