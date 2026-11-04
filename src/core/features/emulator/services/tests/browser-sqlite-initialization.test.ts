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

import { mock } from '@/testing/utils';
import { initializeBrowserSQLite } from '@features/emulator/services/db';

jest.mock('jeep-sqlite/loader', () => ({ defineCustomElements: jest.fn() }));

describe('Browser SQLite initialization', () => {
    const originalFetch = globalThis.fetch;
    let element: HTMLJeepSqliteElement;

    beforeEach(() => {
        element = document.createElement('jeep-sqlite');
        element.componentOnReady = jest.fn(async () => element);
        element.isStoreOpen = jest.fn(async () => true);
        element.autoSave = false;
        element.wasmPath = new URL('assets/lib/sql.js', document.baseURI).href;
        document.body.appendChild(element);
        jest.spyOn(customElements, 'whenDefined').mockResolvedValue(HTMLElement);
        globalThis.fetch = jest.fn(async () => mock<Response>({
            ok: true,
            arrayBuffer: async () => new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]).buffer,
        }));
    });

    afterEach(() => {
        element.remove();
        globalThis.fetch = originalFetch;
    });

    it('verifies WASM and reuses the correctly configured browser component', async () => {
        await initializeBrowserSQLite();
        expect(fetch).toHaveBeenCalledWith(`${element.wasmPath}/sql-wasm.wasm`);
        expect(element.componentOnReady).toHaveBeenCalledTimes(1);
        expect(element.isStoreOpen).toHaveBeenCalledTimes(1);
        expect(document.querySelectorAll('jeep-sqlite')).toHaveLength(1);
    });

    it('rejects missing WASM before a component or database can be opened', async () => {
        jest.mocked(fetch).mockResolvedValue(mock<Response>({ ok: false, status: 404 }));
        await expect(initializeBrowserSQLite()).rejects.toThrow('Cannot load SQLite WASM (404)');
        expect(element.componentOnReady).not.toHaveBeenCalled();
    });

    it('rejects invalid WASM rather than hanging in the bundled loader', async () => {
        jest.mocked(fetch).mockResolvedValue(mock<Response>({
            ok: true, arrayBuffer: async () => new ArrayBuffer(0),
        }));
        await expect(initializeBrowserSQLite()).rejects.toThrow();
        expect(element.componentOnReady).not.toHaveBeenCalled();
    });

    it('rejects an unavailable store', async () => {
        jest.mocked(element.isStoreOpen).mockResolvedValue(false);
        await expect(initializeBrowserSQLite()).rejects.toThrow('unavailable or incompatible');
    });

    it('refuses auto-save because it would export intermediate transaction state', async () => {
        element.autoSave = true;
        await expect(initializeBrowserSQLite()).rejects.toThrow('unavailable or incompatible');
    });
});
