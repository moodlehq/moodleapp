// (C) Copyright 2015 Martin Dougiamas
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

import { SQLite, SQLiteObject } from '@ionic-native/sqlite';
import { Platform } from 'ionic-angular';

/**
 * Schema of a table.
 */
export interface SQLiteDBTableSchema {
    /**
     * The table name.
     * @type {string}
     */
    name: string;

    /**
     * The columns to create in the table.
     * @type {SQLiteDBColumnSchema[]}
     */
    columns: SQLiteDBColumnSchema[];

    /**
     * Names of columns that are primary key. Use it for compound primary keys.
     * @type {string[]}
     */
    primaryKeys?: string[];

    /**
     * List of sets of unique columns. E.g: [['section', 'title'], ['author', 'title']].
     * @type {string[][]}
     */
    uniqueKeys?: string[][];

    /**
     * List of foreign keys.
     * @type {SQLiteDBForeignKeySchema[]}
     */
    foreignKeys?: SQLiteDBForeignKeySchema[];

    /**
     * Check constraint for the table.
     * @type {string}
     */
    tableCheck?: string;
}

/**
 * Schema of a column.
 */
export interface SQLiteDBColumnSchema {
    /**
     * Column's name.
     * @type {string}
     */
    name: string;

    /**
     * Column's type.
     * @type {string}
     */
    type?: 'INTEGER' | 'REAL' | 'TEXT' | 'BLOB';

    /**
     * Whether the column is a primary key. Use it only if primary key is a single column.
     * @type {boolean}
     */
    primaryKey?: boolean;

    /**
     * Whether it should be autoincremented. Only if primaryKey is true.
     * @type {boolean}
     */
    autoIncrement?: boolean;

    /**
     * True if column shouldn't be null.
     * @type {boolean}
     */
    notNull?: boolean;

    /**
     * WWhether the column is unique.
     * @type {boolean}
     */
    unique?: boolean;

    /**
     * Check constraint for the column.
     * @type {string}
     */
    check?: string;

    /**
     * Default value for the column.
     * @type {string}
     */
    default?: string;
}

/**
 * Schema of a foreign key.
 */
export interface SQLiteDBForeignKeySchema {
    /**
     * Columns to include in this foreign key.
     * @type {string[]}
     */
    columns: string[];

    /**
     * The external table referenced by this key.
     * @type {string}
     */
    table: string;

    /**
     * List of referenced columns from the referenced table.
     * @type {string[]}
     */
    foreignColumns?: string[];

    /**
     * Text with the actions to apply to the foreign key.
     * @type {string}
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
 * this.db = new SQLiteDB('MyDB', sqlite, platform);
 */
export class SQLiteDB {
    db: SQLiteObject;
    promise: Promise<void>;

    /**
     * Create and open the database.
     *
     * @param {string} name Database name.
     * @param {SQLite} sqlite SQLite library.
     * @param {Platform} platform Ionic platform.
     */
    constructor(public name: string, private sqlite: SQLite, private platform: Platform) {
        this.init();
    }

    /**
     * Helper function to create a table if it doesn't exist.
     *
     * @param {string} name The table name.
     * @param {SQLiteDBColumnSchema[]} columns The columns to create in the table.
     * @param {string[]} [primaryKeys] Names of columns that are primary key. Use it for compound primary keys.
     * @param {string[][]} [uniqueKeys] List of sets of unique columns. E.g: [['section', 'title'], ['author', 'title']].
     * @param {SQLiteDBForeignKeySchema[]} [foreignKeys] List of foreign keys.
     * @param {string} [tableCheck] Check constraint for the table.
     * @return SQL query.
     */
    buildCreateTableSql(name: string, columns: SQLiteDBColumnSchema[], primaryKeys?: string[], uniqueKeys?: string[][],
            foreignKeys?: SQLiteDBForeignKeySchema[], tableCheck?: string): string {
        const columnsSql = [];
        let sql = `CREATE TABLE IF NOT EXISTS ${name} (`;

        // First define all the columns.
        for (const index in columns) {
            const column = columns[index];
            let columnSql: string = column.name || '';

            if (column.type) {
                columnSql += ' ' + column.type;
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

            if (typeof column.default != 'undefined') {
                columnSql += ` DEFAULT ${column.default}`;
            }

            columnsSql.push(columnSql);
        }
        sql += columnsSql.join(', ');

        // Now add the table constraints.

        if (primaryKeys && primaryKeys.length) {
            sql += `, PRIMARY KEY (${primaryKeys.join(', ')})`;
        }

        if (uniqueKeys && uniqueKeys.length) {
            for (const index in uniqueKeys) {
                const setOfKeys = uniqueKeys[index];
                if (setOfKeys && setOfKeys.length) {
                    sql += `, UNIQUE (${setOfKeys.join(', ')})`;
                }
            }
        }

        if (tableCheck) {
            sql += `, CHECK (${tableCheck})`;
        }

        for (const index in foreignKeys) {
            const foreignKey = foreignKeys[index];

            if (!foreignKey.columns || !!foreignKey.columns.length) {
                return;
            }

            sql += `, FOREIGN KEY (${foreignKey.columns.join(', ')}) REFERENCES ${foreignKey.table} `;

            if (foreignKey.foreignColumns && foreignKey.foreignColumns.length) {
                sql += `(${foreignKey.foreignColumns.join(', ')})`;
            }

            if (foreignKey.actions) {
                sql += ` ${foreignKey.actions}`;
            }
        }

        return sql + ')';
    }

    /**
     * Close the database.
     *
     * @return {Promise<any>} Promise resolved when done.
     */
    close(): Promise<any> {
        return this.ready().then(() => {
            return this.db.close();
        });
    }

    /**
     * Count the records in a table where all the given conditions met.
     *
     * @param {string} table The table to query.
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @return {Promise<number>} Promise resolved with the count of records returned from the specified criteria.
     */
    countRecords(table: string, conditions?: object): Promise<number> {
        const selectAndParams = this.whereClause(conditions);

        return this.countRecordsSelect(table, selectAndParams[0], selectAndParams[1]);
    }

    /**
     * Count the records in a table which match a particular WHERE clause.
     *
     * @param {string} table The table to query.
     * @param {string} [select] A fragment of SQL to be used in a where clause in the SQL call.
     * @param {any} [params] An array of sql parameters.
     * @param {string} [countItem] The count string to be used in the SQL call. Default is COUNT('x').
     * @return {Promise<number>} Promise resolved with the count of records returned from the specified criteria.
     */
    countRecordsSelect(table: string, select: string = '', params?: any, countItem: string = 'COUNT(\'x\')'): Promise<number> {
        if (select) {
            select = 'WHERE ' + select;
        }

        return this.countRecordsSql(`SELECT ${countItem} FROM ${table} ${select}`, params);
    }

    /**
     * Get the result of a SQL SELECT COUNT(...) query.
     *
     * Given a query that counts rows, return that count.
     *
     * @param {string} sql The SQL string you wish to be executed.
     * @param {any} [params] An array of sql parameters.
     * @return {Promise<number>} Promise resolved with the count.
     */
    countRecordsSql(sql: string, params?: any): Promise<number> {
        return this.getFieldSql(sql, params).then((count) => {
            if (typeof count != 'number' || count < 0) {
                return 0;
            }

            return count;
        });
    }

    /**
     * Create a table if it doesn't exist.
     *
     * @param {string} name The table name.
     * @param {SQLiteDBColumnSchema[]} columns The columns to create in the table.
     * @param {string[]} [primaryKeys] Names of columns that are primary key. Use it for compound primary keys.
     * @param {string[][]} [uniqueKeys] List of sets of unique columns. E.g: [['section', 'title'], ['author', 'title']].
     * @param {SQLiteDBForeignKeySchema[]} [foreignKeys] List of foreign keys.
     * @param {string} [tableCheck] Check constraint for the table.
     * @return {Promise<any>} Promise resolved when success.
     */
    createTable(name: string, columns: SQLiteDBColumnSchema[], primaryKeys?: string[], uniqueKeys?: string[][],
            foreignKeys?: SQLiteDBForeignKeySchema[], tableCheck?: string): Promise<any> {
        const sql = this.buildCreateTableSql(name, columns, primaryKeys, uniqueKeys, foreignKeys, tableCheck);

        return this.execute(sql);
    }

    /**
     * Create a table if it doesn't exist from a schema.
     *
     * @param {SQLiteDBTableSchema} table Table schema.
     * @return {Promise<any>} Promise resolved when success.
     */
    createTableFromSchema(table: SQLiteDBTableSchema): Promise<any> {
        return this.createTable(table.name, table.columns, table.primaryKeys, table.uniqueKeys,
            table.foreignKeys, table.tableCheck);
    }

    /**
     * Create several tables if they don't exist from a list of schemas.
     *
     * @param {SQLiteDBTableSchema[]} tables List of table schema.
     * @return {Promise<any>} Promise resolved when success.
     */
    createTablesFromSchema(tables: SQLiteDBTableSchema[]): Promise<any> {
        const promises = [];
        tables.forEach((table) => {
            promises.push(this.createTableFromSchema(table));
        });

        return Promise.all(promises);
    }

    /**
     * Delete the records from a table where all the given conditions met.
     * If conditions not specified, table is truncated.
     *
     * @param {string} table The table to delete from.
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @return {Promise<any>} Promise resolved when done.
     */
    deleteRecords(table: string, conditions?: object): Promise<any> {
        if (conditions === null || typeof conditions == 'undefined') {
            // No conditions, delete the whole table.
            return this.execute(`DELETE FROM ${table}`);
        }

        const selectAndParams = this.whereClause(conditions);

        return this.deleteRecordsSelect(table, selectAndParams[0], selectAndParams[1]);
    }

    /**
     * Delete the records from a table where one field match one list of values.
     *
     * @param {string} table The table to delete from.
     * @param {string} field The name of a field.
     * @param {any[]} values The values field might take.
     * @return {Promise<any>} Promise resolved when done.
     */
    deleteRecordsList(table: string, field: string, values: any[]): Promise<any> {
        const selectAndParams = this.whereClauseList(field, values);

        return this.deleteRecordsSelect(table, selectAndParams[0], selectAndParams[1]);
    }

    /**
     * Delete one or more records from a table which match a particular WHERE clause.
     *
     * @param {string} table The table to delete from.
     * @param {string} [select] A fragment of SQL to be used in a where clause in the SQL call.
     * @param {any[]} [params] Array of sql parameters.
     * @return {Promise<any>} Promise resolved when done.
     */
    deleteRecordsSelect(table: string, select: string = '', params?: any[]): Promise<any> {
        if (select) {
            select = 'WHERE ' + select;
        }

        return this.execute(`DELETE FROM ${table} ${select}`, params);
    }

    /**
     * Drop a table if it exists.
     *
     * @param {string} name The table name.
     * @return {Promise<any>} Promise resolved when success.
     */
    dropTable(name: string): Promise<any> {
        return this.execute(`DROP TABLE IF EXISTS ${name}`);
    }

    /**
     * Execute a SQL query.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param {string} sql SQL query to execute.
     * @param {any[]} params Query parameters.
     * @return {Promise<any>} Promise resolved with the result.
     */
    execute(sql: string, params?: any[]): Promise<any> {
        return this.ready().then(() => {
            return this.db.executeSql(sql, params);
        });
    }

    /**
     * Execute a set of SQL queries. This operation is atomic.
     * IMPORTANT: Use this function only if you cannot use any of the other functions in this API. Please take into account that
     * these query will be run in SQLite (Mobile) and Web SQL (desktop), so your query should work in both environments.
     *
     * @param {any[]} sqlStatements SQL statements to execute.
     * @return {Promise<any>} Promise resolved with the result.
     */
    executeBatch(sqlStatements: any[]): Promise<any> {
        return this.ready().then(() => {
            return this.db.sqlBatch(sqlStatements);
        });
    }

    /**
     * Format the data to insert in the database. Removes undefined entries so they are stored as null instead of 'undefined'.
     *
     * @param {object} data Data to insert.
     */
    protected formatDataToInsert(data: object): void {
        if (!data) {
            return;
        }

        // Remove undefined entries and convert null to "NULL".
        for (const name in data) {
            const value = data[name];
            if (typeof value == 'undefined') {
                delete data[name];
            }
        }
    }

    /**
     * Get all the records from a table.
     *
     * @param {string} table The table to query.
     * @return {Promise<any>} Promise resolved with the records.
     */
    getAllRecords(table: string): Promise<any> {
        return this.getRecords(table);
    }

    /**
     * Get a single field value from a table record where all the given conditions met.
     *
     * @param {string} table The table to query.
     * @param {string} field The field to return the value of.
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @return {Promise<any>} Promise resolved with the field's value.
     */
    getField(table: string, field: string, conditions?: object): Promise<any> {
        const selectAndParams = this.whereClause(conditions);

        return this.getFieldSelect(table, field, selectAndParams[0], selectAndParams[1]);
    }

    /**
     * Get a single field value from a table record which match a particular WHERE clause.
     *
     * @param {string} table The table to query.
     * @param {string} field The field to return the value of.
     * @param {string} [select=''] A fragment of SQL to be used in a where clause returning one row with one column.
     * @param {any[]} [params] Array of sql parameters.
     * @return {Promise<any>} Promise resolved with the field's value.
     */
    getFieldSelect(table: string, field: string, select: string = '', params?: any[]): Promise<any> {
        if (select) {
            select = 'WHERE ' + select;
        }

        return this.getFieldSql(`SELECT ${field} FROM ${table} ${select}`, params);
    }

    /**
     * Get a single field value (first field) using a SQL statement.
     *
     * @param {string} sql The SQL query returning one row with one column.
     * @param {any[]} [params] An array of sql parameters.
     * @return {Promise<any>} Promise resolved with the field's value.
     */
    getFieldSql(sql: string, params?: any[]): Promise<any> {
        return this.getRecordSql(sql, params).then((record) => {
            if (!record) {
                return Promise.reject(null);
            }

            // Return the first property.
            return record[Object.keys(record)[0]];
        });
    }

    /**
     * Constructs 'IN()' or '=' sql fragment
     *
     * @param {any} items A single value or array of values for the expression. It doesn't accept objects.
     * @param {boolean} [equal=true] True means we want to equate to the constructed expression.
     * @param {any} [onEmptyItems] This defines the behavior when the array of items provided is empty. Defaults to false,
     *              meaning return empty. Other values will become part of the returned SQL fragment.
     * @return {any[]} A list containing the constructed sql fragment and an array of parameters.
     */
    getInOrEqual(items: any, equal: boolean = true, onEmptyItems?: any): any[] {
        let sql,
            params;

        if (typeof onEmptyItems == 'undefined') {
            onEmptyItems = false;
        }

        // Default behavior, return empty data on empty array.
        if (Array.isArray(items) && !items.length && onEmptyItems === false) {
            return ['', []];
        }

        // Handle onEmptyItems on empty array of items.
        if (Array.isArray(items) && !items.length) {
            if (onEmptyItems === null) { // Special case, NULL value.
                sql = equal ? ' IS NULL' : ' IS NOT NULL';

                return [sql, []];
            } else {
                items = [onEmptyItems]; // Rest of cases, prepare items for processing.
            }
        }

        if (!Array.isArray(items) || items.length == 1) {
            sql = equal ? '= ?' : '<> ?';
            params = Array.isArray(items) ? items : [items];
        } else {
            sql = (equal ? '' : 'NOT ') + 'IN (' + ',?'.repeat(items.length).substr(1) + ')';
            params = items;
        }

        return [sql, params];
    }

    /**
     * Get the database name.
     *
     * @return {string} Database name.
     */
    getName(): string {
        return this.name;
    }

    /**
     * Get a single database record where all the given conditions met.
     *
     * @param {string} table The table to query.
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @param {string} [fields='*'] A comma separated list of fields to return.
     * @return {Promise<any>} Promise resolved with the record, rejected if not found.
     */
    getRecord(table: string, conditions?: object, fields: string = '*'): Promise<any> {
        const selectAndParams = this.whereClause(conditions);

        return this.getRecordSelect(table, selectAndParams[0], selectAndParams[1], fields);
    }

    /**
     * Get a single database record as an object which match a particular WHERE clause.
     *
     * @param {string} table The table to query.
     * @param {string} [select] A fragment of SQL to be used in a where clause in the SQL call.
     * @param {any[]} [params] An array of sql parameters.
     * @param {string} [fields='*'] A comma separated list of fields to return.
     * @return {Promise<any>} Promise resolved with the record, rejected if not found.
     */
    getRecordSelect(table: string, select: string = '', params: any[] = [], fields: string = '*'): Promise<any> {
        if (select) {
            select = ' WHERE ' + select;
        }

        return this.getRecordSql(`SELECT ${fields} FROM ${table} ${select}`, params);
    }

    /**
     * Get a single database record as an object using a SQL statement.
     *
     * The SQL statement should normally only return one record.
     * It is recommended to use getRecordsSql() if more matches possible!
     *
     * @param {string} sql The SQL string you wish to be executed, should normally only return one record.
     * @param {any[]} [params] List of sql parameters
     * @return {Promise<any>} Promise resolved with the records.
     */
    getRecordSql(sql: string, params?: any[]): Promise<any> {
        return this.getRecordsSql(sql, params, 0, 1).then((result) => {
            if (!result || !result.length) {
                // Not found, reject.
                return Promise.reject(null);
            }

            // Return only the first record.
            return result[0];
        });
    }

    /**
     * Get a number of records where all the given conditions met.
     *
     * @param {string} table The table to query.
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @param {string} [sort=''] An order to sort the results in.
     * @param {string} [fields='*'] A comma separated list of fields to return.
     * @param {number} [limitFrom=0] Return a subset of records, starting at this point.
     * @param {number} [limitNum=0] Return a subset comprising this many records in total.
     * @return {Promise<any>} Promise resolved with the records.
     */
    getRecords(table: string, conditions?: object, sort: string = '', fields: string = '*', limitFrom: number = 0,
            limitNum: number = 0): Promise<any> {
        const selectAndParams = this.whereClause(conditions);

        return this.getRecordsSelect(table, selectAndParams[0], selectAndParams[1], sort, fields, limitFrom, limitNum);
    }

    /**
     * Get a number of records where one field match one list of values.
     *
     * @param {string} table The database table to be checked against.
     * @param {string} field The name of a field.
     * @param {any[]} values The values field might take.
     * @param {string} [sort=''] An order to sort the results in.
     * @param {string} [fields='*'] A comma separated list of fields to return.
     * @param {number} [limitFrom=0] Return a subset of records, starting at this point.
     * @param {number} [limitNum=0] Return a subset comprising this many records in total.
     * @return {Promise<any>} Promise resolved with the records.
     */
    getRecordsList(table: string, field: string, values: any[], sort: string = '', fields: string = '*', limitFrom: number = 0,
            limitNum: number = 0): Promise<any> {
        const selectAndParams = this.whereClauseList(field, values);

        return this.getRecordsSelect(table, selectAndParams[0], selectAndParams[1], sort, fields, limitFrom, limitNum);
    }

    /**
     * Get a number of records which match a particular WHERE clause.
     *
     * @param {string} table The table to query.
     * @param {string} [select] A fragment of SQL to be used in a where clause in the SQL call.
     * @param {any[]} [params] An array of sql parameters.
     * @param {string} [sort=''] An order to sort the results in.
     * @param {string} [fields='*'] A comma separated list of fields to return.
     * @param {number} [limitFrom=0] Return a subset of records, starting at this point.
     * @param {number} [limitNum=0] Return a subset comprising this many records in total.
     * @return {Promise<any>} Promise resolved with the records.
     */
    getRecordsSelect(table: string, select: string = '', params: any[] = [], sort: string = '', fields: string = '*',
            limitFrom: number = 0, limitNum: number = 0): Promise<any> {
        if (select) {
            select = ' WHERE ' + select;
        }
        if (sort) {
            sort = ' ORDER BY ' + sort;
        }

        const sql = `SELECT ${fields} FROM ${table} ${select} ${sort}`;

        return this.getRecordsSql(sql, params, limitFrom, limitNum);
    }

    /**
     * Get a number of records using a SQL statement.
     *
     * @param {string} sql The SQL select query to execute.
     * @param {any[]} [params] List of sql parameters
     * @param {number} [limitFrom] Return a subset of records, starting at this point.
     * @param {number} [limitNum] Return a subset comprising this many records.
     * @return {Promise<any>} Promise resolved with the records.
     */
    getRecordsSql(sql: string, params?: any[], limitFrom?: number, limitNum?: number): Promise<any> {
        const limits = this.normaliseLimitFromNum(limitFrom, limitNum);

        if (limits[0] || limits[1]) {
            if (limits[1] < 1) {
                limits[1] = Number.MAX_VALUE;
            }
            sql += ' LIMIT ' + limits[0] + ', ' + limits[1];
        }

        return this.execute(sql, params).then((result) => {
            // Retrieve the records.
            const records = [];
            for (let i = 0; i < result.rows.length; i++) {
                records.push(result.rows.item(i));
            }

            return records;
        });
    }

    /**
     * Given a data object, returns the SQL query and the params to insert that record.
     *
     * @param {string} table The database table.
     * @param {object} data A data object with values for one or more fields in the record.
     * @return {any[]} Array with the SQL query and the params.
     */
    protected getSqlInsertQuery(table: string, data: object): any[] {
        this.formatDataToInsert(data);

        const keys = Object.keys(data),
            fields = keys.join(','),
            questionMarks = ',?'.repeat(keys.length).substr(1);

        return [
            `INSERT OR REPLACE INTO ${table} (${fields}) VALUES (${questionMarks})`,
            keys.map((key) => data[key])
        ];
    }

    /**
     * Initialize the database.
     */
    init(): void {
        this.promise = this.platform.ready().then(() => {
            return this.sqlite.create({
                name: this.name,
                location: 'default'
            });
        }).then((db: SQLiteObject) => {
            this.db = db;
        });
    }

    /**
     * Insert a record into a table and return the "rowId" field.
     *
     * @param {string} table The database table to be inserted into.
     * @param {object} data A data object with values for one or more fields in the record.
     * @return {Promise<number>} Promise resolved with new rowId. Please notice this rowId is internal from SQLite.
     */
    insertRecord(table: string, data: object): Promise<number> {
        const sqlAndParams = this.getSqlInsertQuery(table, data);

        return this.execute(sqlAndParams[0], sqlAndParams[1]).then((result) => {
            return result.insertId;
        });
    }

    /**
     * Insert multiple records into database as fast as possible.
     *
     * @param {string} table The database table to be inserted into.
     * @param {object[]} dataObjects List of objects to be inserted.
     * @return {Promise<any>} Promise resolved when done.
     */
    insertRecords(table: string, dataObjects: object[]): Promise<any> {
        if (!Array.isArray(dataObjects)) {
            return Promise.reject(null);
        }

        const statements = [];

        dataObjects.forEach((dataObject) => {
            statements.push(this.getSqlInsertQuery(table, dataObject));
        });

        return this.executeBatch(statements);
    }

    /**
     * Insert multiple records into database from another table.
     *
     * @param {string} table The database table to be inserted into.
     * @param {string} source The database table to get the records from.
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @param {string} [fields='*'] A comma separated list of fields to return.
     * @return {Promise<any>} Promise resolved when done.
     */
    insertRecordsFrom(table: string, source: string, conditions?: object, fields: string = '*'): Promise<any> {
        const selectAndParams = this.whereClause(conditions);
        const select = selectAndParams[0] ? 'WHERE ' + selectAndParams[0] : '';
        const params = selectAndParams[1];

        return this.execute(`INSERT INTO ${table} SELECT ${fields} FROM ${source} ${select}`, params);
    }

    /**
     * Ensures that limit params are numeric and positive integers, to be passed to the database.
     * We explicitly treat null, '' and -1 as 0 in order to provide compatibility with how limit
     * values have been passed historically.
     *
     * @param {any} limitFrom Where to start results from.
     * @param {any} limitNum How many results to return.
     * @return {number[]} Normalised limit params in array: [limitFrom, limitNum].
     */
    normaliseLimitFromNum(limitFrom: any, limitNum: any): number[] {
        // We explicilty treat these cases as 0.
        if (typeof limitFrom == 'undefined' || limitFrom === null || limitFrom === '' || limitFrom === -1) {
            limitFrom = 0;
        }
        if (typeof limitNum == 'undefined' || limitNum === null || limitNum === '' || limitNum === -1) {
            limitNum = 0;
        }

        limitFrom = parseInt(limitFrom, 10);
        limitNum = parseInt(limitNum, 10);
        limitFrom = Math.max(0, limitFrom);
        limitNum = Math.max(0, limitNum);

        return [limitFrom, limitNum];
    }

    /**
     * Open the database. Only needed if it was closed before, a database is automatically opened when created.
     *
     * @return {Promise<void>} Promise resolved when open.
     */
    open(): Promise<any> {
        return this.ready().then(() => {
            return this.db.open();
        });
    }

    /**
     * Wait for the DB to be ready.
     *
     * @return {Promise<void>} Promise resolved when ready.
     */
    ready(): Promise<void> {
        return this.promise;
    }

    /**
     * Test whether a record exists in a table where all the given conditions met.
     *
     * @param {string} table The table to check.
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @return {Promise<void>} Promise resolved if exists, rejected otherwise.
     */
    recordExists(table: string, conditions?: object): Promise<void> {
        return this.getRecord(table, conditions).then((record) => {
            if (!record) {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Test whether any records exists in a table which match a particular WHERE clause.
     *
     * @param {string} table The table to query.
     * @param {string} [select] A fragment of SQL to be used in a where clause in the SQL call.
     * @param {any[]} [params] An array of sql parameters.
     * @return {Promise<any>} Promise resolved if exists, rejected otherwise.
     */
    recordExistsSelect(table: string, select: string = '', params: any[] = []): Promise<any> {
        return this.getRecordSelect(table, select, params).then((record) => {
            if (!record) {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Test whether a SQL SELECT statement returns any records.
     *
     * @param {string} sql The SQL query returning one row with one column.
     * @param {any[]} [params] An array of sql parameters.
     * @return {Promise<any>} Promise resolved if exists, rejected otherwise.
     */
    recordExistsSql(sql: string, params?: any[]): Promise<any> {
        return this.getRecordSql(sql, params).then((record) => {
            if (!record) {
                return Promise.reject(null);
            }
        });
    }

    /**
     * Test whether a table exists..
     *
     * @param {string} name The table name.
     * @return {Promise<void>} Promise resolved if exists, rejected otherwise.
     */
    tableExists(name: string): Promise<void> {
        return this.recordExists('sqlite_master', {type: 'table', tbl_name: name});
    }

    /**
     * Update one or more records in a table.
     *
     * @param {string} string table The database table to update.
     * @param {any} data An object with the fields to update: fieldname=>fieldvalue.
     * @param {any} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @return {Promise<any>} Promise resolved when updated.
     */
    updateRecords(table: string, data: any, conditions?: any): Promise<any> {

        this.formatDataToInsert(data);

        if (!data || !Object.keys(data).length) {
            // No fields to update, consider it's done.
            return Promise.resolve();
        }

        const whereAndParams = this.whereClause(conditions),
            sets = [];
        let sql,
            params;

        for (const key in data) {
            sets.push(`${key} = ?`);
        }

        sql = `UPDATE ${table} SET ${sets.join(', ')} WHERE ${whereAndParams[0]}`;
        // Create the list of params using the "data" object and the params for the where clause.
        params = Object.keys(data).map((key) => data[key]).concat(whereAndParams[1]);

        return this.execute(sql, params);
    }

    /**
     * Update one or more records in a table. It accepts a WHERE clause as a string.
     *
     * @param {string} string table The database table to update.
     * @param {any} data An object with the fields to update: fieldname=>fieldvalue.
     * @param {string} [where] Where clause. Must not include the "WHERE" word.
     * @param {any[]} [whereParams] Params for the where clause.
     * @return {Promise<any>} Promise resolved when updated.
     */
    updateRecordsWhere(table: string, data: any, where?: string, whereParams?: any[]): Promise<any> {
        if (!data || !Object.keys(data).length) {
            // No fields to update, consider it's done.
            return Promise.resolve();
        }

        const sets = [];
        let sql,
            params;

        for (const key in data) {
            sets.push(`${key} = ?`);
        }

        sql = `UPDATE ${table} SET ${sets.join(', ')}`;
        if (where) {
            sql += ` WHERE ${where}`;
        }

        // Create the list of params using the "data" object and the params for the where clause.
        params = Object.keys(data).map((key) => data[key]);
        if (where && whereParams) {
            params = params.concat(whereParams);
        }

        return this.execute(sql, params);
    }

    /**
     * Returns the SQL WHERE conditions.
     *
     * @param {object} [conditions] The conditions to build the where clause. Must not contain numeric indexes.
     * @return {any[]} An array list containing sql 'where' part and 'params'.
     */
    whereClause(conditions: any = {}): any[] {
        if (!conditions || !Object.keys(conditions).length) {
            return ['1 = 1', []];
        }

        const where = [],
            params = [];

        for (const key in conditions) {
            const value = conditions[key];

            if (typeof value == 'undefined' || value === null) {
                where.push(key + ' IS NULL');
            } else {
                where.push(key + ' = ?');
                params.push(value);
            }
        }

        return [where.join(' AND '), params];
    }

    /**
     * Returns SQL WHERE conditions for the ..._list group of methods.
     *
     * @param {string} field The name of a field.
     * @param {any[]} values The values field might take.
     * @return {any[]} An array containing sql 'where' part and 'params'.
     */
    whereClauseList(field: string, values: any[]): any[] {
        if (!values || !values.length) {
            return ['1 = 2', []]; // Fake condition, won't return rows ever.
        }

        const params = [];
        let select = '';

        values.forEach((value) => {
            if (typeof value == 'boolean') {
                value = Number(value);
            }

            if (typeof value == 'undefined' || value === null) {
                select = field + ' IS NULL';
            } else {
                params.push(value);
            }
        });

        if (params && params.length) {
            if (select !== '') {
                select = select + ' OR ';
            }

            if (params.length == 1) {
                select = select + field + ' = ?';
            } else {
                const questionMarks = ',?'.repeat(params.length).substr(1);
                select = select + field + ' IN (' + questionMarks + ')';
            }
        }

        return [select, params];
    }
}
