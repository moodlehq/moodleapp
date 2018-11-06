// (C) Copyright 2015 Martin Dougiamas
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
import { Network } from '@ionic-native/network';
import { Observable, Subject } from 'rxjs';

/**
 * Emulates the Cordova Globalization plugin in desktop apps and in browser.
 */
@Injectable()
export class NetworkMock extends Network {
    type: null;

    constructor() {
        super();

        (<any> window).Connection = {
            UNKNOWN: 'unknown',
            ETHERNET: 'ethernet',
            WIFI: 'wifi',
            CELL_2G: '2g',
            CELL_3G: '3g',
            CELL_4G: '4g',
            CELL: 'cellular',
            NONE: 'none'
        };
    }

    /**
     * Returns an observable to watch connection changes.
     *
     * @return {Observable<any>} Observable.
     */
    onchange(): Observable<any> {
        return Observable.merge(this.onConnect(), this.onDisconnect());
    }

    /**
     * Returns an observable to notify when the app is connected.
     *
     * @return {Observable<any>} Observable.
     */
    onConnect(): Observable<any> {
        const observable = new Subject<any>();

        window.addEventListener('online', (ev) => {
            observable.next(ev);
        }, false);

        return observable;
    }

    /**
     * Returns an observable to notify when the app is disconnected.
     *
     * @return {Observable<any>} Observable.
     */
    onDisconnect(): Observable<any> {
        const observable = new Subject<any>();

        window.addEventListener('offline', (ev) => {
            observable.next(ev);
        }, false);

        return observable;
    }
}
