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
import { SQLite } from '@ionic-native/sqlite';
import { Platform } from 'ionic-angular';
import { SQLiteDB } from '@classes/sqlitedb';
import { SQLiteDBMock } from '@core/emulator/classes/sqlitedb';

/**
 * This service allows interacting with the local database to store and retrieve data.
 */
@Injectable()
export class CoreDbProvider {

    protected dbInstances = {};

    constructor(private sqlite: SQLite, private platform: Platform) { }

    /**
     * Get or create a database object.
     *
     * The database objects are cached statically.
     *
     * @param name DB name.
     * @param forceNew True if it should always create a new instance.
     * @return DB.
     */
    getDB(name: string, forceNew?: boolean): SQLiteDB {
        if (typeof this.dbInstances[name] === 'undefined' || forceNew) {
            if (this.platform.is('cordova')) {
                this.dbInstances[name] = new SQLiteDB(name, this.sqlite, this.platform);
            } else {
                this.dbInstances[name] = new SQLiteDBMock(name);
            }
        }

        return this.dbInstances[name];
    }

    /**
     * Delete a DB.
     *
     * @param name DB name.
     * @return Promise resolved when the DB is deleted.
     */
    deleteDB(name: string): Promise<any> {
        let promise;

        if (typeof this.dbInstances[name] != 'undefined') {
            // Close the database first.
            promise = this.dbInstances[name].close();
        } else {
            promise = Promise.resolve();
        }

        return promise.then(() => {
            const db = this.dbInstances[name];
            delete this.dbInstances[name];

            if (this.platform.is('cordova')) {
                return this.sqlite.deleteDatabase({
                    name: name,
                    location: 'default'
                });
            } else {
                // In WebSQL we cannot delete the database, just empty it.
                return db.emptyDatabase();
            }
        });
    }
}
