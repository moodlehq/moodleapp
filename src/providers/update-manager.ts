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
import { CoreConfigProvider } from './config';
import { CoreFilepoolProvider } from './filepool';
import { CoreInitHandler, CoreInitDelegate } from './init';
import { CoreLocalNotificationsProvider } from './local-notifications';
import { CoreLoggerProvider } from './logger';
import { CoreSitesProvider } from './sites';
import { CoreUtilsProvider } from './utils/utils';
import { CoreTimeUtilsProvider } from './utils/time';
import { CoreConfigConstants } from '../configconstants';
import { AddonCalendarProvider } from '@addon/calendar/providers/calendar';

/**
 * Data to migrate a store of Ionic 1 app to the SQLite DB.
 */
export interface CoreUpdateManagerMigrateTable {
    /**
     * Current name of the store/table.
     */
    name: string;

    /**
     * New name of the table. If not defined, "name" will be used.
     */
    newName?: string;

    /**
     * An object to rename and convert some fields of the table/store.
     */
    fields?: {
        name: string, // Field name in the old app.
        newName?: string, // New field name. If not provided, keep the same name.
        type?: string, // Type of the field if it needs to be treated: 'any', 'object', 'date', 'boolean'.
        delete?: boolean // Whether the field must be deleted because it isn't needed in the new schema.
    }[];

    /**
     * If set, all the fields that aren't in this array will be deleted. The names in this list should be the new names.
     */
    filterFields?: string[];
}

/**
 * Factory to handle app updates. This factory shouldn't be used outside of core.
 *
 * This service handles processes that need to be run when updating the app, like migrate Ionic 1 database data to Ionic 3.
 */
@Injectable()
export class CoreUpdateManagerProvider implements CoreInitHandler {
    // Data for init delegate.
    name = 'CoreUpdateManager';
    priority = CoreInitDelegate.MAX_RECOMMENDED_PRIORITY + 300;
    blocking = true;

    protected VERSION_APPLIED = 'version_applied';
    protected logger;
    protected localNotificationsComponentsMigrate: {[old: string]: string} = {};

    /**
     * Tables to migrate from app DB ('MoodleMobile'). Include all the core ones to decrease the dependencies.
     */
    protected appDBTables: CoreUpdateManagerMigrateTable[] = [
        {
            name: 'config',
            newName: 'core_config',
            fields: [
                {
                    name: 'value',
                    type: 'any'
                }
            ]
        },
        {
            name: 'cron'
        },
        {
            name: 'current_site',
            fields: [
                {
                    name: 'siteid',
                    newName: 'siteId'
                }
            ]
        },
        {
            name: 'desktop_local_notifications',
            fields: [
                {
                    name: 'data',
                    type: 'object'
                },
                {
                    name: 'triggered',
                    type: 'boolean'
                }
            ],
            filterFields: ['id', 'title', 'text', 'at', 'data', 'triggered']
        },
        {
            name: 'files_queue',
            newName: 'filepool_files_queue',
            fields: [
                {
                    name: 'isexternalfile',
                    type: 'boolean'
                },
                {
                    name: 'links',
                    type: 'object'
                },
                {
                    name: 'sortorder',
                    delete: true
                }
            ]
        },
        {
            name: 'notification_components'
        },
        {
            name: 'notification_sites'
        },
        {
            name: 'notifications_triggered'
        },
        {
            name: 'shared_files'
        },
        {
            name: 'sites',
            fields: [
                {
                    name: 'siteurl',
                    newName: 'siteUrl'
                },
                {
                    name: 'infos',
                    newName: 'info',
                    type: 'object'
                },
                {
                    name: 'privatetoken',
                    newName: 'privateToken'
                },
                {
                    name: 'config',
                    type: 'object'
                },
                {
                    name: 'loggedout',
                    newName: 'loggedOut'
                }
            ]
        },
    ];

    /**
     * Tables to migrate from each site DB. Include all the core ones to decrease the dependencies.
     */
    protected siteDBTables: CoreUpdateManagerMigrateTable[] = [
        {
            name: 'check_updates_times',
            fields: [
                {
                    name: 'courseid',
                    newName: 'courseId'
                }
            ]
        },
        {
            name: 'course_status',
            fields: [
                {
                    name: 'previous',
                    newName: 'previousStatus'
                },
                {
                    name: 'downloadtime',
                    newName: 'downloadTime'
                },
                {
                    name: 'previousdownloadtime',
                    newName: 'previousDownloadTime'
                }
            ]
        },
        {
            name: 'filepool',
            newName: 'filepool_files',
            fields: [
                {
                    name: 'stale',
                    type: 'boolean'
                },
                {
                    name: 'downloaded',
                    newName: 'downloadTime'
                },
                {
                    name: 'isexternalfile',
                    type: 'boolean'
                }
            ]
        },
        {
            name: 'files_links',
            newName: 'filepool_files_links',
            fields: [
                {
                    name: 'componentAndId',
                    delete: true
                }
            ]
        },
        {
            name: 'filepool_packages',
            fields: [
                {
                    name: 'downloadtime',
                    newName: 'downloadTime'
                },
                {
                    name: 'previousdownloadtime',
                    newName: 'previousDownloadTime'
                },
                {
                    name: 'revision', // Move the value of 'revision' to 'extra' so SCORMs keep working.
                    newName: 'extra'
                },
                {
                    name: 'timemodified',
                    delete: true
                }
            ]
        },
        {
            name: 'mm_emulator_last_received_notification',
            newName: 'core_emulator_last_received_notification',
            filterFields: ['component', 'id', 'timecreated']
        },
        {
            name: 'questions',
            fields: [
                {
                    name: 'componentId',
                    newName: 'componentid'
                },
                {
                    name: 'componentAndAttempt',
                    delete: true
                },
                {
                    name: 'componentAndComponentId',
                    delete: true
                }
            ]
        },
        {
            name: 'question_answers',
            fields: [
                {
                    name: 'componentId',
                    newName: 'componentid'
                },
                {
                    name: 'componentAndAttempt',
                    delete: true
                },
                {
                    name: 'componentAndComponentId',
                    delete: true
                },
                {
                    name: 'componentAndAttemptAndQuestion',
                    delete: true
                }
            ]
        },
        {
            name: 'sync'
        },
        {
            name: 'users'
        },
        {
            name: 'wscache',
            fields: [
                {
                    name: 'data',
                    type: 'object'
                },
                {
                    name: 'expirationtime',
                    newName: 'expirationTime'
                }
            ]
        }
    ];

    constructor(logger: CoreLoggerProvider, private configProvider: CoreConfigProvider, private sitesProvider: CoreSitesProvider,
            private filepoolProvider: CoreFilepoolProvider, private notifProvider: CoreLocalNotificationsProvider,
            private utils: CoreUtilsProvider, private timeUtils: CoreTimeUtilsProvider,
            private calendarProvider: AddonCalendarProvider) {
        this.logger = logger.getInstance('CoreUpdateManagerProvider');
    }

    /**
     * Check if the app has been updated and performs the needed processes.
     * This function shouldn't be used outside of core.
     *
     * @return Promise resolved when the update process finishes.
     */
    load(): Promise<any> {
        const promises = [],
            versionCode = CoreConfigConstants.versioncode;

        return this.configProvider.get(this.VERSION_APPLIED, 0).then((versionApplied: number) => {

            if (versionCode >= 2013 && versionApplied < 2013 && versionApplied > 0) {
                promises.push(this.migrateFileExtensions());
            }

            if (versionCode >= 2017 && versionApplied < 2017 && versionApplied > 0) {
                promises.push(this.setCalendarDefaultNotifTime());
                promises.push(this.setSitesConfig());
            }

            // In version 2018 we adapted the forum offline stores to match a new schema.
            // However, due to the migration of data to SQLite we can no longer do that.

            if (versionCode >= 3500 && versionApplied < 3500 && versionApplied > 0) {
                promises.push(this.logoutLegacySites());
            }

            return Promise.all(promises).then(() => {
                return this.configProvider.set(this.VERSION_APPLIED, versionCode);
            }).catch((error) => {
                this.logger.error(`Error applying update from ${versionApplied} to ${versionCode}`, error);
            });
        });
    }

    /**
     * Register several app tables to be migrated to the new schema.
     *
     * @param tables The tables to migrate.
     */
    registerAppTablesMigration(tables: CoreUpdateManagerMigrateTable[]): void {
        tables.forEach((table) => {
            this.registerAppTableMigration(table);
        });
    }

    /**
     * Register an app table to be migrated to the new schema.
     *
     * @param table The table to migrate.
     */
    registerAppTableMigration(table: CoreUpdateManagerMigrateTable): void {
        this.appDBTables.push(table);
    }

    /**
     * Register several site tables to be migrated to the new schema.
     *
     * @param tables The tables to migrate.
     */
    registerSiteTablesMigration(tables: CoreUpdateManagerMigrateTable[]): void {
        tables.forEach((table) => {
            this.registerSiteTableMigration(table);
        });
    }

    /**
     * Register a site table to be migrated to the new schema.
     *
     * @param table The table to migrate.
     */
    registerSiteTableMigration(table: CoreUpdateManagerMigrateTable): void {
        this.siteDBTables.push(table);
    }

    /**
     * Register a migration of component name for local notifications.
     *
     * @param oldName The old name.
     * @param newName The new name.
     */
    registerLocalNotifComponentMigration(oldName: string, newName: string): void {
        this.localNotificationsComponentsMigrate[oldName] = newName;
    }

    /**
     * Migrates files filling extensions.
     *
     * @return Promise resolved when the site migration is finished.
     */
    protected migrateFileExtensions(): Promise<any> {
        return this.sitesProvider.getSitesIds().then((sites) => {
            const promises = [];
            sites.forEach((siteId) => {
                promises.push(this.filepoolProvider.fillMissingExtensionInFiles(siteId));
            });
            promises.push(this.filepoolProvider.treatExtensionInQueue());

            return Promise.all(promises);
        });
    }

    /**
     * Calendar default notification time is configurable from version 3.2.1, and a new option "Default" is added.
     * All events that were configured to use the fixed default time should now be configured to use "Default" option.
     *
     * @return Promise resolved when the events are configured.
     */
    protected setCalendarDefaultNotifTime(): Promise<any> {
        if (!this.notifProvider.isAvailable()) {
            // Local notifications not available, nothing to do.
            return Promise.resolve();
        }

        const now = this.timeUtils.timestamp();

        return this.sitesProvider.getSitesIds().then((siteIds) => {

            const promises = [];
            siteIds.forEach((siteId) => {
                // Get stored events.
                promises.push(this.calendarProvider.getAllEventsFromLocalDb(siteId).then((events) => {
                    const eventPromises = [];

                    events.forEach((event) => {
                        if (event.notificationtime && event.notificationtime == AddonCalendarProvider.DEFAULT_NOTIFICATION_TIME) {
                            eventPromises.push(this.calendarProvider.addEventReminder(event, -1, siteId));
                        } else if (event.notificationtime && event.notificationtime > 0) {
                            const time = event.timestart - event.notificationtime * 60;

                            if (time < now) {
                                // Old reminder, just not add this.
                                return;
                            }
                            eventPromises.push(this.calendarProvider.addEventReminder(event, time, siteId));
                        }
                    });

                    return Promise.all(eventPromises);
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * In version 3.2.1 we want the site config to be stored in each site if available.
     * Since it can be slow, we'll only block retrieving the config of current site, the rest will be in background.
     *
     * @return Promise resolved when the config is loaded for the current site (if any).
     */
    protected setSitesConfig(): Promise<any> {
        return this.sitesProvider.getSitesIds().then((siteIds) => {

            return this.sitesProvider.getStoredCurrentSiteId().catch(() => {
                // Error getting current site.
            }).then((currentSiteId) => {
                let promise;

                // Load the config of current site first.
                if (currentSiteId) {
                    promise = this.setSiteConfig(currentSiteId);
                } else {
                    promise = Promise.resolve();
                }

                // Load the config of rest of sites in background.
                siteIds.forEach((siteId) => {
                    if (siteId != currentSiteId) {
                        this.setSiteConfig(siteId);
                    }
                });

                return promise;
            });
        });
    }

    /**
     * Store the config of a site.
     *
     * @param siteId Site ID.
     * @return Promise resolved when the config is loaded for the site.
     */
    protected setSiteConfig(siteId: string): Promise<any> {
        return this.sitesProvider.getSite(siteId).then((site) => {
            if (site.getStoredConfig() || !site.wsAvailable('tool_mobile_get_config')) {
                // Site already has the config or it cannot be retrieved. Stop.
                return;
            }

            // Get the site config.
            return site.getConfig().then((config) => {
                return this.sitesProvider.addSite(
                    site.getId(), site.getURL(), site.getToken(), site.getInfo(), site.getPrivateToken(), config);
            }).catch(() => {
                // Ignore errors.
            });
        });
    }

    /**
     * Logout from legacy sites.
     *
     * @return Promise resolved when done.
     */
    protected logoutLegacySites(): Promise<any> {
        return this.sitesProvider.getSitesIds().then((siteIds) => {
            const promises = [];

            siteIds.forEach((siteId) => {
                promises.push(this.sitesProvider.getSite(siteId).then((site) => {
                    // If the site is a legacy site, mark it as logged out so the user has to authenticate again.
                    if (this.sitesProvider.isLegacyMoodleByInfo(site.getInfo())) {
                        return this.sitesProvider.setSiteLoggedOut(site.getId(), true);
                    }
                }));
            });

            return this.utils.allPromises(promises);
        });
    }
}
