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

import { mock, mockSingleton } from '@/testing/utils';
import { CoreSitesProvider } from '@services/sites';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreAuthenticatedSite } from '@classes/sites/authenticated-site';
import { CoreSite } from '@classes/sites/site';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { SiteDBEntry } from '@services/database/sites';
import { CoreDB } from '@services/db';
import { CoreSiteInfoResponse } from '@classes/sites/unauthenticated-site';
import { SQLiteDB } from '@classes/sqlitedb';
import { CoreConfig } from '@services/config';

class TestSitesProvider extends CoreSitesProvider {

    /**
     * Keep these tests focused on storage after successful server/version validation.
     *
     * @returns Valid server version.
     */
    protected isValidMoodleVersion(): number {
        return CoreSitesProvider.VALID_VERSION;
    }

    /**
     * Supply the saved-site cache without initialising unrelated application services.
     *
     * @param table Saved-site table.
     */
    setTable(table: CoreDatabaseTable<SiteDBEntry>): void {
        this.sitesTable.setInstance(table);
    }

    /**
     * Access the real schema coordinator for focused flow assertions.
     *
     * @returns Site schema coordinator.
     */
    get schemaManager() {
        return this.sitesDB;
    }

}

describe('Site database lifecycle integration', () => {
    let provider: TestSitesProvider;
    let table: CoreDatabaseTable<SiteDBEntry>;
    let site: CoreSite;
    let prepare: jest.Mock;
    const id = 'test';
    const info = mock<CoreSiteInfoResponse>({ siteurl: 'https://example.invalid', username: 'user' });

    beforeEach(() => {
        mockSingleton(CoreConfig, { ready: jest.fn(async () => undefined) });
        provider = new TestSitesProvider([]);
        table = mock<CoreDatabaseTable<SiteDBEntry>>({
            getMany: jest.fn(async () => []),
            deleteByPrimaryKey: jest.fn(async () => undefined),
        });
        provider.setTable(table);
        site = mock<CoreSite>({
            setOAuthId: jest.fn(),
            deleteDB: jest.fn(async () => undefined),
            deleteFolder: jest.fn(async () => undefined),
        });
        prepare = jest.fn(async () => undefined);
        mockSingleton(CoreDB, { prepareSiteDatabase: prepare, completeDatabaseInitialization: jest.fn(async () => undefined) });
        mockSingleton(CoreSitesFactory, {
            makeAuthenticatedSite: () => mock<CoreAuthenticatedSite>({ fetchSiteInfo: jest.fn(async () => info) }),
            makeSite: jest.fn(() => site),
        });
        jest.spyOn(provider, 'createSiteID').mockReturnValue(id);
    });

    it('propagates an existing site database failure without reserving a new database', async () => {
        jest.mocked(table.getMany).mockResolvedValue([mock<SiteDBEntry>({ id })]);
        const error = new Error('Existing database is corrupt');
        jest.spyOn(provider, 'getSite').mockRejectedValue(error);
        await expect(provider.newSite(info.siteurl, 'token')).rejects.toBe(error);
        expect(prepare).not.toHaveBeenCalled();
        expect(CoreSitesFactory.makeSite).not.toHaveBeenCalled();
    });

    it('propagates saved-site query errors instead of treating them as an absent account', async () => {
        const error = new Error('Saved-site cache failed');
        jest.mocked(table.getMany).mockRejectedValue(error);
        await expect(provider.newSite(info.siteurl, 'token')).rejects.toBe(error);
        expect(prepare).not.toHaveBeenCalled();
        expect(CoreSitesFactory.makeSite).not.toHaveBeenCalled();
    });

    it('reserves an authenticated new site before constructing it or installing any schema', async () => {
        const stop = new Error('Stop after checking ordering');
        const migrate = jest.spyOn(provider.schemaManager, 'migrateSiteSchemas').mockRejectedValue(stop);
        await expect(provider.newSite(info.siteurl, 'token')).rejects.toBe(stop);
        expect(prepare).toHaveBeenCalledWith(id);
        const constructing = jest.mocked(CoreSitesFactory.makeSite).mock.invocationCallOrder[0];
        expect(prepare.mock.invocationCallOrder[0]).toBeLessThan(constructing);
        expect(constructing).toBeLessThan(migrate.mock.invocationCallOrder[0]);
    });

    it('does not construct a site when its creation reservation fails', async () => {
        const error = new Error('Cannot persist reservation');
        prepare.mockRejectedValue(error);
        await expect(provider.newSite(info.siteurl, 'token')).rejects.toBe(error);
        expect(CoreSitesFactory.makeSite).not.toHaveBeenCalled();
    });

    it('reports failed saved-site removal and does not claim the deletion finished', async () => {
        jest.spyOn(provider, 'getSite').mockResolvedValue(site);
        const error = new Error('Cannot remove saved account');
        jest.mocked(table.deleteByPrimaryKey).mockRejectedValue(error);
        await expect(provider.deleteSite(id)).rejects.toBe(error);
        expect(site.deleteDB).toHaveBeenCalledTimes(1);
        expect(table.deleteByPrimaryKey).toHaveBeenCalledWith({ id });
        expect(site.deleteFolder).not.toHaveBeenCalled();
    });

    it('seals a site database only after its schema installation finishes', async () => {
        const db = mock<SQLiteDB>({
            createTableFromSchema: jest.fn(async () => undefined),
            getAllRecords: jest.fn(async () => []),
        });
        site.getDb = jest.fn(() => db);
        site.getId = jest.fn(() => id);
        site.id = id;
        await provider.schemaManager.migrateSiteSchemas(site);
        expect(CoreDB.completeDatabaseInitialization).toHaveBeenCalledWith('Site-test');
        const sealing = jest.mocked(CoreDB.completeDatabaseInitialization).mock.invocationCallOrder[0];
        expect(jest.mocked(db.createTableFromSchema).mock.invocationCallOrder[0]).toBeLessThan(sealing);
        expect(jest.mocked(db.getAllRecords).mock.invocationCallOrder[0]).toBeLessThan(sealing);
    });

    it('does not seal a site database after failed schema installation', async () => {
        const error = new Error('Schema creation failed');
        const db = mock<SQLiteDB>({ createTableFromSchema: jest.fn(async () => { throw error; }) });
        site.getDb = jest.fn(() => db);
        site.getId = jest.fn(() => id);
        site.id = id;
        await expect(provider.schemaManager.migrateSiteSchemas(site)).rejects.toBe(error);
        expect(CoreDB.completeDatabaseInitialization).not.toHaveBeenCalled();
    });
});
