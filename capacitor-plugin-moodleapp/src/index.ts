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

import { BROWSER_LAUNCHER_PLUGIN_NAME, BrowserLauncher } from './plugins/BrowserLauncher';
import { DISK_SPACE_PLUGIN_NAME, DiskSpace } from './plugins/DiskSpace';
import { INSTALL_REFERRER_PLUGIN_NAME, InstallReferrer } from './plugins/InstallReferrer';
import { PREVENT_OVERRIDE_PLUGIN_NAME, PreventOverride } from './plugins/PreventOverride';
import { SECURE_STORAGE_PLUGIN_NAME, SecureStorage } from './plugins/SecureStorage';
import { Capacitor } from '@capacitor/core';

export type { InstallReferrerResult } from './plugins/InstallReferrer';
export type { SecureStorage } from './plugins/SecureStorage';

// Wrapped in plain classes because Capacitor proxies are thenables and break when resolved from a promise.
export const MoodleAppCapacitorPlugins = {
    browserLauncher: new BrowserLauncher(),
    diskSpace: new DiskSpace(),
    installReferrer: new InstallReferrer(),
    preventOverride: new PreventOverride(),
    secureStorage: new SecureStorage(),
};

const MoodleAppCapacitorPluginNames = {
    browserLauncher: BROWSER_LAUNCHER_PLUGIN_NAME,
    diskSpace: DISK_SPACE_PLUGIN_NAME,
    installReferrer: INSTALL_REFERRER_PLUGIN_NAME,
    preventOverride: PREVENT_OVERRIDE_PLUGIN_NAME,
    secureStorage: SECURE_STORAGE_PLUGIN_NAME,
} as const;

/**
 * Check whether a Moodle App Capacitor plugin is available in current platform.
 *
 * @param plugin Plugin name.
 * @returns Whether plugin is available.
 */
export function isMoodleAppCapacitorPluginAvailable(plugin: keyof typeof MoodleAppCapacitorPluginNames): boolean {
    return Capacitor.isPluginAvailable(MoodleAppCapacitorPluginNames[plugin]);
}
