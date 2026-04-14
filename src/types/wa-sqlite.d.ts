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

// IDBBatchAtomicVFS ships as an untyped JS example in wa-sqlite.
// The class implements SQLiteVFS at runtime via its base class chain;
// we only type the static factory used in our code.

declare module 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js' {

    export class IDBBatchAtomicVFS {

        name: string;
        constructor(idbDatabaseName?: string, options?: unknown);

    }

}
