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

import { asyncInstance } from '@/core/utils/async-instance';
import { SQLiteObject } from '@awesome-cordova-plugins/sqlite/ngx';
import { WasmSQLiteObject } from '@features/emulator/classes/wasm-sqlite-object';
import { CoreDbProvider } from '@services/db';

/**
 * Emulates the database provider in the browser.
 */
export class CoreDbProviderMock extends CoreDbProvider {

    /**
     * @inheritdoc
     */
    protected createDatabase(name: string): SQLiteObject {
        return asyncInstance(async () => {
            const db = new WasmSQLiteObject(name);

            await db.open();

            return db;
        });
    }

    /**
     * @inheritdoc
     */
    protected async deleteDatabase(name: string): Promise<void> {
        const db = new WasmSQLiteObject(name);

        await db.delete();
    }

}
