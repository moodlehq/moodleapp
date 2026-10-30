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
import { CoreNative } from '@features/native/services/native';
import { Observable, throwError } from 'rxjs';

/**
 * providedIn plugin wrapper.
 *
 * @deprecated since 6.0. Directly managed by CoreOpener.openOnlineFile.
 */
@Injectable({ providedIn: 'root' })
export class WebIntent {

    /* eslint-disable @typescript-eslint/naming-convention */
    /* eslint-disable @typescript-eslint/no-unused-vars */

    /**
     * Convenience constant for actions
     */
    ACTION_SEND = 'android.intent.action.SEND';

    /**
     * Convenience constant for actions
     */
    ACTION_VIEW = 'android.intent.action.VIEW';

    /**
     * Convenience constant for extras
     */
    EXTRA_TEXT = 'EXTRA_TEXT';

    /**
     * Convenience constant for extras
     */
    EXTRA_SUBJECT = 'EXTRA_SUBJECT';

    /**
     * Convenience constant for extras
     */
    EXTRA_STREAM = 'EXTRA_STREAM';

    /**
     * Convenience constant for extras
     */
    EXTRA_EMAIL = 'EXTRA_EMAIL';

    /**
     * Convenience constant for actions
     */
    ACTION_CALL = 'android.intent.action.CALL';

    /**
     * Convenience constant for actions
     */
    ACTION_SENDTO = 'android.intent.action.SENDTO';

    /**
     * Convenience constant for actions
     */
    ACTION_GET_CONTENT = 'android.intent.action.GET_CONTENT';

    /**
     * Convenience constant for actions
     */
    ACTION_PICK = 'android.intent.action.PICK';

    /**
     * Convenience constant for actions
     */
    ACTION_INSTALL_PACKAGE = 'ACTION_INSTALL_PACKAGE';

    /**
     * Convenience constant for actions
     */
    ACTION_UNINSTALL_PACKAGE = 'android.intent.action.UNINSTALL_PACKAGE';

    /**
     * Launches an Android intent
     *
     * @param options IntentOptions. Only the action VIEW is supported.
     * @returns Promise resolved when the activity is started.
     * @deprecated since 6.0. Use CoreOpener.openOnlineFile instead.
     */
    async startActivity(options: WebIntentOptions): Promise<void> {
        if (options.action !== this.ACTION_VIEW || !options.url) {
            return Promise.reject(new Error(`Starting an activity with action "${options.action}" is not supported.`));
        }

        const intentLauncher = CoreNative.plugin('intentLauncher');
        if (!intentLauncher) {
            return Promise.reject(new Error('Starting an activity is only supported on Android.'));
        }

        await intentLauncher.startViewActivity({ url: options.url, type: options.type });
    }

    /**
     * Starts a new activity and return the result to the application
     *
     * @param options IntentOptions
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    startActivityForResult(options: unknown): Promise<unknown> {
        return Promise.reject(new Error('Starting an activity for result is not supported.'));
    }

    /**
     * Checks if this app was invoked with specified extra
     *
     * @param extra string
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    hasExtra(extra: string): Promise<unknown> {
        return Promise.reject(new Error(`Checking whether the intent has extra "${extra}" is not supported.`));
    }

    /**
     * Gets the extra that this app was invoked with
     *
     * @param extra string
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    getExtra(extra: string): Promise<unknown> {
        return Promise.reject(new Error(`Getting the intent extra "${extra}" is not supported.`));
    }

    /**
     * Gets the Uri the app was invoked with
     *
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    getUri(): Promise<string> {
        return Promise.reject(new Error('Getting the intent URI is not supported.'));
    }

    /**
     * Returns the content of the intent used whenever the application activity is launched
     *
     * @returns Observable that emits an error.
     * @deprecated since 6.0. No replacement is available.
     */
    onIntent(): Observable<unknown> {
        return throwError(() => new Error('Listening to intents is not supported.'));
    }

    /**
     * Sends a custom intent passing optional extras
     *
     * @param options IntentOptions
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    sendBroadcast(options: unknown): Promise<unknown> {
        return Promise.reject(new Error('Sending broadcasts is not supported.'));
    }

    /**
     * Request that a given application service be started
     *
     * @param options IntentOptions
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    startService(options: unknown): Promise<unknown> {
        return Promise.reject(new Error('Starting services is not supported.'));
    }

    /**
     * Registers a broadcast receiver for the specified filters
     *
     * @param filters RegisterBroadcastReceiverOptions
     * @returns Observable that emits an error.
     * @deprecated since 6.0. No replacement is available.
     */
    registerBroadcastReceiver(filters: unknown): Observable<unknown> {
        return throwError(() => new Error('Registering broadcast receivers is not supported.'));
    }

    /**
     * Unregisters a broadcast receiver
     *
     * @deprecated since 6.0. No replacement is available.
     */
    unregisterBroadcastReceiver(): void {
        throw new Error('Unregistering broadcast receivers is not supported.');
    }

    /**
     * Called when an activity you launched exits, giving you the requestCode you started it with,
     *
     * @deprecated since 6.0. No replacement is available.
     */
    onActivityResult(): void {
        throw new Error('Listening to activity results is not supported.');
    }

    /**
     * Gets the intent the app was launched with.
     *
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    getIntent(): Promise<unknown> {
        return Promise.reject(new Error('Getting the intent is not supported.'));
    }

    /**
     * Send a result back to the Intent that started this Activity.
     * The data can be passed using 'extras'.
     *
     * @param root0 Unknown
     * @returns Rejected promise.
     * @deprecated since 6.0. No replacement is available.
     */
    sendResult(root0: unknown): Promise<unknown> {
        return Promise.reject(new Error('Sending activity results is not supported.'));
    }

}

/**
 * Options for WebIntent.startActivity.
 */
type WebIntentOptions = {
    action: string;
    url?: string;
    type?: string;
};
