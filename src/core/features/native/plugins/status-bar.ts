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

/**
 * Retains the legacy StatusBar service name without allowing site plugins to control system bars.
 *
 * @deprecated since 6.0. Site plugins must not control system bars.
 */
@Injectable({ providedIn: 'root' })
export class StatusBar {

    /**
     * Reject legacy visibility queries.
     *
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    get isVisible(): boolean {
        throw new Error('StatusBar.isVisible is no longer supported.');
    }

    /**
     * Reject legacy visibility changes.
     *
     * @param _visible Requested visibility.
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    set isVisible(_visible: boolean) {
        throw new Error('StatusBar.isVisible is no longer supported.');
    }

    /**
     * Reject legacy overlay changes.
     *
     * @param _doesOverlay Requested overlay mode.
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    overlaysWebView(_doesOverlay: boolean): never {
        throw new Error('StatusBar.overlaysWebView is no longer supported.');
    }

    /**
     * Reject legacy dark text styling.
     *
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    styleDefault(): never {
        throw new Error('StatusBar.styleDefault is no longer supported.');
    }

    /**
     * Reject legacy light text styling.
     *
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    styleLightContent(): never {
        throw new Error('StatusBar.styleLightContent is no longer supported.');
    }

    /**
     * Reject legacy named background colours.
     *
     * @param _colorName Requested colour name.
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    backgroundColorByName(_colorName: string): never {
        throw new Error('StatusBar.backgroundColorByName is no longer supported.');
    }

    /**
     * Reject legacy status bar background changes.
     *
     * @param _hexString Requested background colour.
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    backgroundColorByHexString(_hexString: string): never {
        throw new Error('StatusBar.backgroundColorByHexString is no longer supported.');
    }

    /**
     * Reject legacy navigation bar background changes.
     *
     * @param _hexString Requested background colour.
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    navigationBackgroundColorByHexString(_hexString: string): never {
        throw new Error('StatusBar.navigationBackgroundColorByHexString is no longer supported.');
    }

    /**
     * Reject legacy system bar hiding.
     *
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    hide(): never {
        throw new Error('StatusBar.hide is no longer supported.');
    }

    /**
     * Reject legacy system bar showing.
     *
     * @deprecated since 6.0. Site plugins must not control system bars.
     */
    show(): never {
        throw new Error('StatusBar.show is no longer supported.');
    }

}
