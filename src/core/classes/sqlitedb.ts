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

import { SQLiteObject } from '@ionic-native/sqlite/ngx';

import { SQLite } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreDB } from '@services/db';
import { CorePlatform } from '@services/platform';

type SQLiteDBColumnType = 'INTEGER' | 'REAL' | 'TEXT' | 'BLOB';

/**
 * Schema of a table.
 */
export interface SQLiteDBTableSchema {
    /**
     * The table name.
     */
    name: string;

    /**
     * The columns to create in the table.
     */
    columns: SQLiteDBColumnSchema[];

    /**
     * Names of columns that are primary key. Use it for compound primary keys.
     */
    primaryKeys?: string[];

    /**
     * List of sets of unique columns. E.g: [['section', 'title'], ['author', 'title']].
     */
    uniqueKeys?: string[][];

    /**
     * List of foreign keys.
     */
    foreignKeys?: SQLiteDBForeignKeySchema[];

    /**
     * Check constraint for the table.
     */
    tableCheck?: string;
}

/**
 * Schema of a column.
 */
export interface SQLiteDBColumnSchema {
    /**
     * Column's name.
     */
    name: string;

    /**
     * Column's type.
     */
    type?: SQLiteDBColumnType;

    /**
     * Whether the column is a primary key. Use it only if primary key is a single column.
     */
    primaryKey?: boolean;

    /**
     * Whether it should be autoincremented. Only if primaryKey is true.
     */
    autoIncrement?: boolean;

    /**
     * True if column shouldn't be null.
     */
    notNull?: boolean;

    /**
     * WWhether the column is unique.
     */
    unique?: boolean;

    /**
     * Check constraint for the column.
     */
    check?: string;

    /**
     * Default value for the column.
     */
    default?: string;
}

/**
 * Schema of a foreign key.
 */
export interface SQLiteDBForeignKeySchema {
    /**
     * Columns to include in this foreign key.
     */
    columns: string[];

    /**
     * The external table referenced by this key.
     */
    table: string;

    /**
     * List of referenced columns from the referenced table.
     */
    foreignColumns?: string[];

    /**
     * Text with the actions to apply to the foreign key.
     */
    actions?: string;
}

/**
 * Class to interact with the local database.
 *
 * @description
 * This class allows creating and interacting with a SQLite database.
 *
 * You need to supply some dependencies when creating the instance:
 * this.db = new SQLiteDB('MyDB');
 */
export class SQLiteDB {

    /**
     * Constructs 'IN()' or '=' sql fragment
     *
     * @param items A single value or array of values for the expression. It doesn't accept objects.
     * @param equal True means we want to equate to the constructed expression.
     * @param onEmptyItems This defines the behavior when the array of items provided is empty. Defaults to false,
     *                     meaning return empty. Other values will become part of the returned SQL fragment.
     * @returns A list containing the constructed sql fragment and an array of parameters.
     */
    static getInOrEqual(
        items: SQLiteDBRecordValue | SQLiteDBRecordValue[],
        equal: boolean = true,
        onEmptyItems?: SQLiteDBRecordValue | null,
    ): SQLiteDBQueryParams {
        let sql = '';
        let params: SQLiteDBRecordValue[];

        // Default behavior, return empty data on empty array.
        if (Array.isArray(items) && !items.length && onEmptyItems === undefined) {
            return { sql: '', params: [] };
        }

        // Handle onEmptyItems on empty array of items.
        if (Array.isArray(items) && !items.length) {
            if (onEmptyItems === null) { // Special case, NULL value.
                sql = equal ? ' IS NULL' : ' IS NOT NULL';

                return { sql, params: [] };
            } else {
                items = [onEmptyItems as SQLiteDBRecordValue]; // Rest of cases, prepare items for processing.
            }
        }

        if (!Array.isArray(items) || items.length == 1) {
            sql = equal ? '= ?' : '<> ?';
            params = Array.isArray(items) ? items : [items];
        } else {
            const questionMarks = ',?'.repeat(items.length).substring(1);
            sql = (equal ? '' : 'NOT ') + `IN (${questionMarks})`;
            params = items;
        }

        return { sql, params };
    }

    db?: SQLiteObject;
    promise!: Promise<void>;

    /**
     * Create and open the database.
     *
     * @param name Database name.
     */
    constructor(public name: string) {
        this.init();
    }

    /**
     * Add a column to an existing table.
     *
     * @param table Table name.
     * @param column Name of the column to add.
     * @param type Type of the column to add.
     * @param constraints Other constraints (e.g. NOT NULL).
     * @returns Promise resolved when done.
     */
    async addColumn(table: string, column: string, type: SQLiteDBColumnType, constraints?: string): Promise<void> {
        constraints = constraints || '';

        try {
            await this.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type} ${constraints}`);
        } catch (error) {
            if (error && error.code == 5 && error?.message.indexOf('duplicate column name') != -1) {
                // Column already exists.
                return;
            }

            throw error;
        }
    }

    /**
     * Helper function to create a table if it doesn't exist.
     *
     * @param name The table name.
     * @param columns The columns to create in the table.
     * @param primaryKeys Names of columns that are primary key. Use it for compound primary keys.
     * @param uniqueKeys List of sets of unique columns. E.g: [['section', 'title'], ['author', 'title']].
     * @param foreignKeys List of foreign keys.
     * @param tableCheck Check constraint for the table.
     * @returns SQL query.
     */
    buildCreateTableSql(
        name: string,
        columns: SQLiteDBColumnSchema[],
        primaryKeys?: string[],
        uniqueKeys?: string[][],
        foreignKeys?: SQLiteDBForeignKeySchema[],
        tableCheck?: string,
    ): string {
        const columnsSql: string[] = [];
        let tableStructureSQL = '';

        // First define all the columns.
        for (const index in columns) {
            const column = columns[index];
            let columnSql: string = column.name || '';

            if (column.type) {
                columnSql += ` ${column.type}`;
            }

            if (column.primaryKey) {
                columnSql += ' PRIMARY KEY';
                if (column.autoIncrement) {
                    columnSql += ' AUTOINCREMENT';
                }
            }

            if (column.notNull) {
                columnSql += ' NOT NULL';
            }

            if (column.unique) {
                columnSql += ' UNIQUE';
            }

            if (column.check) {
                columnSql += ` CHECK (${column.check})`;
            }

            if (column.default !== undefined) {
                columnSql += ` DEFAULT ${column.default}`;
            }

            columnsSql.push(columnSql);
        }
        tableStructureSQL += columnsSql.join(', ');

        // Now add the table constraints.

        if (primaryKeys && primaryKeys.length) {
            tableStructureSQL += `, PRIMARY KEY (${primaryKeys.join(', ')})`;
        }

        if (uniqueKeys && uniqueKeys.length) {
            for (const index in uniqueKeys) {
                const setOfKeys = uniqueKeys[index];
                if (setOfKeys && setOfKeys.length) {
                    tableStructureSQL += `, UNIQUE (${setOfKeys.join(', ')})`;
                }
            }
        }

        if (tableCheck) {
            tableStructureSQL += `, CHECK (${tableCheck})`;
        }

        for (const index in foreignKeys) {
            const foreignKey = foreignKeys[index];

            if (!foreignKey?.columns.length) {
                continue;
            }

            tableStructureSQL += `, FOREIGN KEY (${foreignKey.columns.join(', ')}) REFERENCES ${foreignKey.table} `;

            if (foreignKey.foreignColumns && foreignKey.foreignColumns.length) {
                tableStructureSQL += `(${foreignKey.foreignColumns.join(', ')})`;
            }

            if (foreignKey.actions) {
                tableStructureSQL += ` ${foreignKey.actions}`;
            }
        }

        return `CREATE TABLE IF NOT EXISTS ${name} (${tableStructureSQL})`;
    }

    /**
     * Close the database.
     *
     * @returns Promise resolved when done.
     */
    async close(): Promise<void> {
        await this.ready();

        await this.db?.close();
    }

    /**
     * Count the records in a table where all the given conditions met.
     *
     * @param table The table to query.
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @returns Promise resolved with the count of records returned from the specified criteria.
     */
    async countRecords(table: string, conditions?: SQLiteDBRecordValues): Promise<number> {
        const selectAndParams = this.whereClause(conditions);

        return this.countRecordsSelect(table, selectAndParams.sql, selectAndParams.params);
    }

    /**
     * Count the records in a table which match a particular WHERE clause.
     *
     * @param table The table to query.
     * @param select A fragment of SQL to be used in a where clause in the SQL call.
     * @param params An array of sql parameters.
     * @param countItem The count string to be used in the SQL call. Default is COUNT('x').
     * @returns Promise resolved with the count of records returned from the specified criteria.
     */
    async countRecordsSelect(
        table: string,
        select: string = '',
        params?: SQLiteDBRecordValue[],
        countItem: string = 'COUNT(\'x\')',
    ): Promise<number> {
        if (select) {
            select = `WHERE ${select}`;
        }

        return this.countRecordsSql(`SELECT ${countItem} FROM ${table} ${select}`, params);
    }

    /**
     * Get the result of a SQL SELECT COUNT(...) query.
     *
     * Given a query that counts rows, return that count.
     *
     * @param sql The SQL string you wish to be executed.
     * @param params An array of sql parameters.
     * @returns Promise resolved with the count.
     */
    async countRecordsSql(sql: string, params?: SQLiteDBRecordValue[]): Promise<number> {
        const count = await this.getFieldSql(sql, params);
        if (typeof count != 'number' || count < 0) {
            return 0;
        }

        return count;
    }

    /**
     * Create a table if it doesn't exist.
     *
     * @param name The table name.
     * @param columns The columns to create in the table.
     * @param primaryKeys Names of columns that are primary key. Use it for compound primary keys.
     * @param uniqueKeys List of sets of unique columns. E.g: [['section', 'title'], ['author', 'title']].
     * @param foreignKeys List of foreign keys.
     * @param tableCheck Check constraint for the table.
     * @returns Promise resolved when success.
     */
    async createTable(
        name: string,
        columns: SQLiteDBColumnSchema[],
        primaryKeys?: string[],
        uniqueKeys?: string[][],
        foreignKeys?: SQLiteDBForeignKeySchema[],
        tableCheck?: string,
    ): Promise<void> {
        const sql = this.buildCreateTableSql(name, columns, primaryKeys, uniqueKeys, foreignKeys, tableCheck);

        await this.execute(sql);
    }

    /**
     * Create a table if it doesn't exist from a schema.
     *
     * @param table Table schema.
     * @returns Promise resolved when success.
     */
    async createTableFromSchema(table: SQLiteDBTableSchema): Promise<void> {
        await this.createTable(table.name, table.columns, table.primaryKeys, table.uniqueKeys, table.foreignKeys, table.tableCheck);
    }

    /**
     * Create several tables if they don't exist from a list of schemas.
     *
     * @param tables List of table schema.
     * @returns Promise resolved when success.
     */
    async createTablesFromSchema(tables: SQLiteDBTableSchema[]): Promise<void> {
        const promises = tables.map(table => this.createTableFromSchema(table));

        await Promise.all(promises);
    }

    /**
     * Delete the records from a table where all the given conditions met.
     * If conditions not specified, table is truncated.
     *
     * @param table The table to delete from.
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @returns Promise resolved with the number of affected rows.
     */
    async deleteRecords(table: string, conditions?: SQLiteDBRecordValues): Promise<number> {
        if (conditions === null || conditions === undefined) {
            // No conditions, delete the whole table.
            const result = await this.execute(`DELETE FROM ${table}`);

            return result.rowsAffected;
        }

        const selectAndParams = this.whereClause(conditions);

        return this.deleteRecordsSelect(table, selectAndParams.sql, selectAndParams.params);
    }

    /**
     * Delete the records from a table where one field match one list of values.
     *
     * @param table The table to delete from.
     * @param field The name of a field.
     * @param values The values field might take.
     * @returns Promise resolved with the number of affected rows.
     */
    async deleteRecordsList(table: string, field: string, values: SQLiteDBRecordValue[]): Promise<number> {
        const selectAndParams = this.whereClauseList(field, values);

        return this.deleteRecordsSelect(table, selectAndParams.sql, selectAndParams.params);
    }

    /**
     * Delete one or more records from a table which match a particular WHERE clause.
     *
     * @param table The table to delete from.
     * @param select A fragment of SQL to be used in a where clause in the SQL call.
     * @param params Array of sql parameters.
     * @returns Promise resolved with the number of affected rows.
     */
    async deleteRecordsSelect(table: string, select: string = '', params?: SQLiteDBRecordValue[]): Promise<number> {
        if (select) {
            select = `WHERE ${select}`;
        }

        const result = await this.execute(`DELETE FROM ${table} ${select}`, params);

        return result.rowsAffected;
    }

    /**
     * Drop a table if it exists.
     *
     * @param name The table name.
     * @returns Promise resolved when success.
     */
    async dropTable(name: string): Promise<void> {
        await this.execute(`DROP TABLE IF EXISTS ${name}`);
    }

    /**
     * Execute a SQL query.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param sql SQL query to execute.
     * @param params Query parameters.
     * @returns Promise resolved with the result.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async execute(sql: string, params?: SQLiteDBRecordValue[]): Promise<any> {
        await this.ready();

        return this.db?.executeSql(sql, params);
    }

    /**
     * Execute a set of SQL queries. This operation is atomic.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param sqlStatements SQL statements to execute.
     * @returns Promise resolved with the result.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async executeBatch(sqlStatements: (string | string[] | any)[]): Promise<void> {
        await this.ready();

        await this.db?.sqlBatch(sqlStatements);
    }

    /**
     * Format the data to insert in the database. Removes undefined entries so they are stored as null instead of 'undefined'.
     *
     * @param data Data to insert.
     */
    protected formatDataToInsert(data: SQLiteDBRecordValues): void {
        if (!data) {
            return;
        }

        // Remove undefined entries.
        Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);
    }

    /**
     * Get all the records from a table.
     *
     * @param table The table to query.
     * @returns Promise resolved with the records.
     */
    async getAllRecords<T = unknown>(table: string): Promise<T[]> {
        return this.getRecords(table);
    }

    /**
     * Get a single field value from a table record where all the given conditions met.
     *
     * @param table The table to query.
     * @param field The field to return the value of.
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @returns Promise resolved with the field's value.
     */
    async getField(table: string, field: string, conditions?: SQLiteDBRecordValues): Promise<SQLiteDBRecordValue> {
        const selectAndParams = this.whereClause(conditions);

        return this.getFieldSelect(table, field, selectAndParams.sql, selectAndParams.params);
    }

    /**
     * Get a single field value from a table record which match a particular WHERE clause.
     *
     * @param table The table to query.
     * @param field The field to return the value of.
     * @param select A fragment of SQL to be used in a where clause returning one row with one column.
     * @param params Array of sql parameters.
     * @returns Promise resolved with the field's value.
     */
    async getFieldSelect(
        table: string,
        field: string,
        select: string = '',
        params?: SQLiteDBRecordValue[],
    ): Promise<SQLiteDBRecordValue> {
        if (select) {
            select = `WHERE ${select}`;
        }

        return this.getFieldSql(`SELECT ${field} FROM ${table} ${select}`, params);
    }

    /**
     * Get a single field value (first field) using a SQL statement.
     *
     * @param sql The SQL query returning one row with one column.
     * @param params An array of sql parameters.
     * @returns Promise resolved with the field's value.
     */
    async getFieldSql(sql: string, params?: SQLiteDBRecordValue[]): Promise<SQLiteDBRecordValue> {
        const record = await this.getRecordSql<Record<string, SQLiteDBRecordValue>>(sql, params);
        if (!record) {
            throw new CoreError('No record found.');
        }

        return record[Object.keys(record)[0]];
    }

    /**
     * Get the database name.
     *
     * @returns Database name.
     */
    getName(): string {
        return this.name;
    }

    /**
     * Get a single database record where all the given conditions met.
     *
     * @param table The table to query.
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @param fields A comma separated list of fields to return.
     * @returns Promise resolved with the record, rejected if not found.
     */
    getRecord<T = unknown>(table: string, conditions?: SQLiteDBRecordValues, fields: string = '*'): Promise<T> {
        const selectAndParams = this.whereClause(conditions);

        return this.getRecordSelect<T>(table, selectAndParams.sql, selectAndParams.params, fields);
    }

    /**
     * Get a single database record as an object which match a particular WHERE clause.
     *
     * @param table The table to query.
     * @param select A fragment of SQL to be used in a where clause in the SQL call.
     * @param params An array of sql parameters.
     * @param fields A comma separated list of fields to return.
     * @returns Promise resolved with the record, rejected if not found.
     */
    getRecordSelect<T = unknown>(
        table: string,
        select: string = '',
        params: SQLiteDBRecordValue[] = [],
        fields: string = '*',
    ): Promise<T> {
        if (select) {
            select = ` WHERE ${select}`;
        }

        return this.getRecordSql<T>(`SELECT ${fields} FROM ${table} ${select}`, params);
    }

    /**
     * Get a single database record as an object using a SQL statement.
     *
     * The SQL statement should normally only return one record.
     * It is recommended to use getRecordsSql() if more matches possible!
     *
     * @param sql The SQL string you wish to be executed, should normally only return one record.
     * @param params List of sql parameters
     * @returns Promise resolved with the records.
     */
    async getRecordSql<T = unknown>(sql: string, params?: SQLiteDBRecordValue[]): Promise<T> {
        const result = await this.getRecordsSql<T>(sql, params, 0, 1);
        if (!result || !result.length) {
            // Not found, reject.
            throw new CoreError('No records found.');
        }

        return result[0];
    }

    /**
     * Get a number of records where all the given conditions met.
     *
     * @param table The table to query.
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @param sort An order to sort the results in.
     * @param fields A comma separated list of fields to return.
     * @param limitFrom Return a subset of records, starting at this point.
     * @param limitNum Return a subset comprising this many records in total.
     * @returns Promise resolved with the records.
     */
    getRecords<T = unknown>(
        table: string,
        conditions?: SQLiteDBRecordValues,
        sort: string = '',
        fields: string = '*',
        limitFrom: number = 0,
        limitNum: number = 0,
    ): Promise<T[]> {
        const selectAndParams = this.whereClause(conditions);

        return this.getRecordsSelect<T>(table, selectAndParams.sql, selectAndParams.params, sort, fields, limitFrom, limitNum);
    }

    /**
     * Get a number of records where one field match one list of values.
     *
     * @param table The database table to be checked against.
     * @param field The name of a field.
     * @param values The values field might take.
     * @param sort An order to sort the results in.
     * @param fields A comma separated list of fields to return.
     * @param limitFrom Return a subset of records, starting at this point.
     * @param limitNum Return a subset comprising this many records in total.
     * @returns Promise resolved with the records.
     */
    getRecordsList<T = unknown>(
        table: string,
        field: string,
        values: SQLiteDBRecordValue[],
        sort: string = '',
        fields: string = '*',
        limitFrom: number = 0,
        limitNum: number = 0,
    ): Promise<T[]> {
        const selectAndParams = this.whereClauseList(field, values);

        return this.getRecordsSelect<T>(table, selectAndParams.sql, selectAndParams.params, sort, fields, limitFrom, limitNum);
    }

    /**
     * Get a number of records which match a particular WHERE clause.
     *
     * @param table The table to query.
     * @param select A fragment of SQL to be used in a where clause in the SQL call.
     * @param params An array of sql parameters.
     * @param sort An order to sort the results in.
     * @param fields A comma separated list of fields to return.
     * @param limitFrom Return a subset of records, starting at this point.
     * @param limitNum Return a subset comprising this many records in total.
     * @returns Promise resolved with the records.
     */
    getRecordsSelect<T = unknown>(
        table: string,
        select: string = '',
        params: SQLiteDBRecordValue[] = [],
        sort: string = '',
        fields: string = '*',
        limitFrom: number = 0,
        limitNum: number = 0,
    ): Promise<T[]> {
        if (select) {
            select = ` WHERE ${select}`;
        }
        if (sort) {
            sort = ` ORDER BY ${sort}`;
        }

        const sql = `SELECT ${fields} FROM ${table} ${select} ${sort}`;

        return this.getRecordsSql<T>(sql, params, limitFrom, limitNum);
    }

    /**
     * Get a number of records using a SQL statement.
     *
     * @param sql The SQL select query to execute.
     * @param params List of sql parameters
     * @param limitFrom Return a subset of records, starting at this point.
     * @param limitNum Return a subset comprising this many records.
     * @returns Promise resolved with the records.
     */
    async getRecordsSql<T = unknown>(
        sql: string,
        params?: SQLiteDBRecordValue[],
        limitFrom?: number,
        limitNum?: number,
    ): Promise<T[]> {
        const limits = this.normaliseLimitFromNum(limitFrom, limitNum);

        if (limits[0] || limits[1]) {
            if (limits[1] < 1) {
                limits[1] = Number.MAX_VALUE;
            }
            sql += ` LIMIT ${limits[0]}, ${limits[1]}`;
        }

        const result = await this.execute(sql, params);
        // Retrieve the records.
        const records: T[] = [];
        for (let i = 0; i < result.rows.length; i++) {
            records.push(result.rows.item(i));
        }

        return records;
    }

    /**
     * Given a data object, returns the SQL query and the params to insert that record.
     *
     * @param table The database table.
     * @param data A data object with values for one or more fields in the record.
     * @returns Array with the SQL query and the params.
     */
    protected getSqlInsertQuery(table: string, data: SQLiteDBRecordValues): SQLiteDBQueryParams {
        this.formatDataToInsert(data);

        const keys = Object.keys(data);
        const fields = keys.join(',');
        const questionMarks = ',?'.repeat(keys.length).substring(1);

        return {
            sql: `INSERT OR REPLACE INTO ${table} (${fields}) VALUES (${questionMarks})`,
            params: Object.values(data),
        };
    }

    /**
     * Initialize the database.
     */
    init(): void {
        this.promise = this.createDatabase().then(db => {
            if (CoreDB.loggingEnabled()) {
                const spies = this.getDatabaseSpies(db);

                db = new Proxy(db, {
                    get: (target, property, receiver) => spies[property] ?? Reflect.get(target, property, receiver),
                });
            }

            this.db = db;

            return;
        });
    }

    /**
     * Insert a record into a table and return the "rowId" field.
     *
     * @param table The database table to be inserted into.
     * @param data A data object with values for one or more fields in the record.
     * @returns Promise resolved with new rowId. Please notice this rowId is internal from SQLite.
     */
    async insertRecord(table: string, data: SQLiteDBRecordValues): Promise<number> {
        const sqlAndParams = this.getSqlInsertQuery(table, data);
        const result = await this.execute(sqlAndParams.sql, sqlAndParams.params);

        return result.insertId;
    }

    /**
     * Insert multiple records into database as fast as possible.
     *
     * @param table The database table to be inserted into.
     * @param dataObjects List of objects to be inserted.
     * @returns Promise resolved when done.
     */
    async insertRecords(table: string, dataObjects: SQLiteDBRecordValues[]): Promise<void> {
        if (!Array.isArray(dataObjects)) {
            throw new CoreError('Invalid parameter supplied to insertRecords, it should be an array.');
        }

        const statements = dataObjects.map((dataObject) => {
            const statement = this.getSqlInsertQuery(table, dataObject);

            return [statement.sql, statement.params];
        });

        await this.executeBatch(statements);
    }

    /**
     * Insert multiple records into database from another table.
     *
     * @param table The database table to be inserted into.
     * @param source The database table to get the records from.
     * @returns Promise resolved when done.
     */
    async insertRecordsFrom(
        table: string,
        source: string,
    ): Promise<void> {
        const records = await this.getAllRecords<SQLiteDBRecordValues>(source);

        await Promise.all(records.map((record) => this.insertRecord(table, record)));
    }

    /**
     * Migrate all the data from a table to another table.
     * It will check if old table exists and drop it when finished.
     *
     * @param oldTable Old table name.
     * @param newTable New table name.
     * @param mapCallback Mapping callback to migrate each record.
     * @returns Resolved when done.
     */
    async migrateTable(
        oldTable: string,
        newTable: string,
        mapCallback?: (record: SQLiteDBRecordValues) => SQLiteDBRecordValues,
    ): Promise<void> {
        try {
            await this.tableExists(oldTable);
        } catch {
            // Old table does not exist, ignore.
            return;
        }

        // Move the records from the old table.
        if (mapCallback) {
            const records = await this.getAllRecords<SQLiteDBRecordValues>(oldTable);
            const promises = records.map((record) => {
                record = mapCallback(record);

                return this.insertRecord(newTable, record);
            });

            await Promise.all(promises);
        } else {
            // No changes needed.
            await this.insertRecordsFrom(newTable, oldTable);
        }

        try {
            await this.dropTable(oldTable);
        } catch {
            // Error deleting old table, ignore.
        }
    }

    /**
     * Ensures that limit params are numeric and positive integers, to be passed to the database.
     * We explicitly treat null, '' and -1 as 0 in order to provide compatibility with how limit
     * values have been passed historically.
     *
     * @param limitFrom Where to start results from.
     * @param limitNum How many results to return.
     * @returns Normalised limit params in array: [limitFrom, limitNum].
     */
    normaliseLimitFromNum(limitFrom?: number, limitNum?: number): number[] {
        // We explicilty treat these cases as 0.
        if (!limitFrom || limitFrom === -1) {
            limitFrom = 0;
        } else {
            limitFrom = Math.max(0, limitFrom);
        }

        if (!limitNum || limitNum === -1) {
            limitNum = 0;
        } else {
            limitNum = Math.max(0, limitNum);
        }

        return [limitFrom, limitNum];
    }

    /**
     * Open the database. Only needed if it was closed before, a database is automatically opened when created.
     *
     * @returns Promise resolved when open.
     */
    async open(): Promise<void> {
        await this.ready();

        await this.db?.open();
    }

    /**
     * Wait for the DB to be ready.
     *
     * @returns Promise resolved when ready.
     */
    ready(): Promise<void> {
        return this.promise;
    }

    /**
     * Test whether a record exists in a table where all the given conditions met.
     *
     * @param table The table to check.
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @returns Promise resolved if exists, rejected otherwise.
     */
    async recordExists(table: string, conditions?: SQLiteDBRecordValues): Promise<void> {
        const record = await this.getRecord(table, conditions);
        if (!record) {
            throw new CoreError('Record does not exist.');
        }
    }

    /**
     * Test whether any records exists in a table which match a particular WHERE clause.
     *
     * @param table The table to query.
     * @param select A fragment of SQL to be used in a where clause in the SQL call.
     * @param params An array of sql parameters.
     * @returns Promise resolved if exists, rejected otherwise.
     */
    async recordExistsSelect(table: string, select: string = '', params: SQLiteDBRecordValue[] = []): Promise<void> {
        const record = await this.getRecordSelect(table, select, params);
        if (!record) {
            throw new CoreError('Record does not exist.');
        }
    }

    /**
     * Test whether a SQL SELECT statement returns any records.
     *
     * @param sql The SQL query returning one row with one column.
     * @param params An array of sql parameters.
     * @returns Promise resolved if exists, rejected otherwise.
     */
    async recordExistsSql(sql: string, params?: SQLiteDBRecordValue[]): Promise<void> {
        const record = await this.getRecordSql(sql, params);
        if (!record) {
            throw new CoreError('Record does not exist.');
        }
    }

    /**
     * Test whether a table exists..
     *
     * @param name The table name.
     * @returns Promise resolved if exists, rejected otherwise.
     */
    async tableExists(name: string): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        await this.recordExists('sqlite_master', { type: 'table', tbl_name: name });
    }

    /**
     * Update one or more records in a table.
     *
     * @param table The database table to update.
     * @param data An object with the fields to update: fieldname=>fieldvalue.
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @returns Promise resolved with the number of affected rows.
     */
    async updateRecords(table: string, data: SQLiteDBRecordValues, conditions?: SQLiteDBRecordValues): Promise<number> {
        const whereAndParams = this.whereClause(conditions);

        return this.updateRecordsWhere(table, data, whereAndParams.sql, whereAndParams.params);
    }

    /**
     * Update one or more records in a table. It accepts a WHERE clause as a string.
     *
     * @param table The database table to update.
     * @param data An object with the fields to update: fieldname=>fieldvalue.
     * @param where Where clause. Must not include the "WHERE" word.
     * @param whereParams Params for the where clause.
     * @returns Promise resolved with the number of affected rows.
     */
    async updateRecordsWhere(
        table: string,
        data: SQLiteDBRecordValues,
        where?: string,
        whereParams?: SQLiteDBRecordValue[],
    ): Promise<number> {
        this.formatDataToInsert(data);
        if (!data || !Object.keys(data).length) {
            // No fields to update, consider it's done.
            return 0;
        }

        const sets = Object.keys(data).map(key => `${key} = ?`);
        let sql = `UPDATE ${table} SET ${sets.join(', ')}`;
        if (where) {
            sql += ` WHERE ${where}`;
        }

        // Create the list of params using the "data" object and the params for the where clause.
        let params = Object.values(data);
        if (where && whereParams) {
            params = params.concat(whereParams);
        }

        const result = await this.execute(sql, params);

        return result.rowsAffected;
    }

    /**
     * Returns the SQL WHERE conditions.
     *
     * @param conditions The conditions to build the where clause. Must not contain numeric indexes.
     * @returns An array list containing sql 'where' part and 'params'.
     */
    whereClause(conditions: SQLiteDBRecordValues = {}): SQLiteDBQueryParams {
        if (!conditions || !Object.keys(conditions).length) {
            return {
                sql: '1 = 1',
                params: [],
            };
        }

        const params: SQLiteDBRecordValue[] = [];

        const where = Object.keys(conditions).map((field) => {
            const value = conditions[field];

            if (value === undefined || value === null) {
                return `${field} IS NULL`;
            }

            params.push(value);

            return `${field} = ?`;
        });

        return {
            sql: where.join(' AND '),
            params,
        };
    }

    /**
     * Returns SQL WHERE conditions for the ..._list group of methods.
     *
     * @param field The name of a field.
     * @param values The values field might take.
     * @returns An array containing sql 'where' part and 'params'.
     */
    whereClauseList(field: string, values: SQLiteDBRecordValue[]): SQLiteDBQueryParams {
        if (!values || !values.length) {
            return {
                sql: '1 = 2', // Fake condition, won't return rows ever.
                params: [],
            };
        }

        const params: SQLiteDBRecordValue[] = [];
        let sql = '';

        values.forEach((value) => {
            if (value === undefined || value === null) {
                sql = `${field} IS NULL`;
            } else {
                params.push(value);
            }
        });

        if (params && params.length) {
            if (sql !== '') {
                sql += ' OR ';
            }

            if (params.length == 1) {
                sql += `${field} = ?`;
            } else {
                const questionMarks = ',?'.repeat(params.length).substring(1);
                sql += ` ${field} IN (${questionMarks})`;
            }
        }

        return { sql, params };
    }

    /**
     * Open a database connection.
     *
     * @returns Database.
     */
    protected async createDatabase(): Promise<SQLiteObject> {
        await CorePlatform.ready();

        return SQLite.create({ name: this.name, location: 'default' });
    }

    /**
     * Get database spy methods to intercept database calls and track logging information.
     *
     * @param db Database to spy.
     * @returns Spy methods.
     */
    protected getDatabaseSpies(db: SQLiteObject): Partial<SQLiteObject> {
        const dbName = this.name;

        return {
            async executeSql(statement, params) {
                const start = performance.now();

                try {
                    const result = await db.executeSql(statement, params);

                    CoreDB.logQuery({
                        params,
                        sql: statement,
                        duration:  performance.now() - start,
                        dbName,
                    });

                    return result;
                } catch (error) {
                    CoreDB.logQuery({
                        params,
                        error,
                        sql: statement,
                        duration:  performance.now() - start,
                        dbName,
                    });

                    throw error;
                }
            },
            async sqlBatch(statements) {
                const start = performance.now();
                const sql = Array.isArray(statements)
                    ? statements.join(' | ')
                    : String(statements);

                try {
                    const result = await db.sqlBatch(statements);

                    CoreDB.logQuery({
                        sql,
                        duration: performance.now() - start,
                        dbName,
                    });

                    return result;
                } catch (error) {
                    CoreDB.logQuery({
                        sql,
                        error,
                        duration: performance.now() - start,
                        dbName,
                    });

                    throw error;
                }
            },
        };
    }

}

export type SQLiteDBRecordValues = {
    [key: string]: SQLiteDBRecordValue;
};

export type SQLiteDBQueryParams = {
    sql: string;
    params: SQLiteDBRecordValue[];
};

export type SQLiteDBRecordValue = number | string  | undefined | null;
