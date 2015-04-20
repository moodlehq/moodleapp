// TypeScript definition for YDN-DB version 1

interface FullTextSource {
  storeName: string;
  keyPath: string;
  weight?: number;
}

interface FullTextCatalog {
  name: string;
  lang: string;
  sources: FullTextSource[];
}

interface IndexSchemaJson {
  name?: string;
  keyPath: string; // FIXME: keyPath can be array, how to union type?
  type?: string;
  unique?: bool;
  multiEntry?: bool;
}

interface IndexSchemaJson {
  name?: string;
  keyPath: string[]; // FIXME: keyPath can be array, how to union type?
  type?: string;
  unique?: bool;
  multiEntry?: bool;
}

interface StoreSchemaJson {
  autoIncrement?: bool;
  dispatchEvents?: bool;
  name?: string;
  indexes?: IndexSchemaJson[];
  keyPath?: string;
  type?: string;
}

interface DatabaseSchemaJson {
  version?: number;
  stores: StoreSchemaJson[];
  fullTextCatalogs: FullTextCatalog;
}

interface StorageOptions {
  mechanisms?: string[];
  size?: number;
  autoSchema?: bool;
  isSerial?: bool;
  requestType?: string;
}

declare module ydn.db
{
  export class Request {
    abort();
    always(callback: (data: any) => void);
    done(callback: (data: any) => void);
    fail(callback: (data: any) => void);
    then(success_callback: (data: any) => any, error_callback: (data: Error) => any);
    canAbort(): boolean;
  }

  export function cmp(first: any, second: any): number;

  export function deleteDatabase(db_name: string, type?: string): void;

  export class Key {
    constructor(json: Object);
    constructor(key_string: string);
    constructor(store_name: string, id: any, parent_key?: Key);
  }

  export class Iterator {
    join(peer_store_name: string, peer_field_name?: string, value?: any);
    getKey(): any;
    getPrimaryKey(): any;
    reset() : Iterator;
    restrict(peer_field_name: string, value: any);
    resume(key: any, index_key: any) : Iterator;
    reverse(key: any, index_key: any) : Iterator;
  }

  enum EventType {
    created,
    deleted,
    error,
    fail,
    ready,
    updated
  }

  enum Policy {
    all,
    atomic,
    multi,
    repeat,
    single
  }

  enum TransactionMode {
    readonly,
    readwrite
  }

  enum Op {
        >, <, =, >=, <=, ^
  }

  export class IndexKeyIterator extends Iterator {
    constructor(store_name: string, index_name: string, key_range?: any, reverse?: bool);

    static where (store_name: string, index_name: string, op: Op, value: any, op2: Op, value2: any);

  }

  export class KeyIterator extends Iterator {
    constructor(store_name: string, key_range?: any, reverse?: bool);

    static where(store_name: string, op: Op, value: any, op2: Op, value2: any);

  }

  export class ValueIterator extends Iterator {
    constructor(store_name: string, key_range?: any, reverse?: bool);

    static where(store_name: string, op: Op, value: any, op2: Op, value2: any);

  }

  export class IndexValueIterator extends Iterator {
    constructor(store_name: string, index_name: string, key_range?: any, reverse?: bool);

    static where(store_name: string, index_name: string, op: Op, value: any, op2: Op, value2: any);

  }

  export class Streamer {
    constructor(storage?: ydn.db.Storage, store_name: string, index_name?: string, foreign_index_name?: string);

    push(key: any, value?: any);

    collect(callback: (values: any[]) => void);

    setSink(callback: (key: any, value: any, toWait: () => bool) => void);
  }

  export class ICursor {
    getKey(i?: number): any;
    getPrimaryKey(i?: number): any;
    getValue(i?: number): any;
    clear(i?: number) : Request;
    update(value: Object, i?: number) : Request;
  }

  export class Query {
    count(): Request;
    open(callback: (ICursor)=>void, Iterator, TransactionMode): Request;
    patch(Object): Request;
    patch(field_name: string, value: any): Request;
    patch(field_names: string[], value: any[]): Request;
    order(field_name: string) : Query;
    order(field_name: string, descending: bool) : Query;
    order(field_names: string[]) : Query;
    order(field_names: string[], descending: bool) : Query;
    reverse() : Query;
    list() : Request;
    list(limit: number) : Request;
    where(field_name: string, op: Op, value: any);
    where(field_name: string, op: Op, value: any, op2: Op, value2: any);
  }

  export class DbOperator {

    add(store_name: string, value: any, key: any) : Request;
    add(store_name: string, value: any) : Request;

    clear(store_name: string, key_or_key_range: any) : Request;
    clear(store_name: string) : Request;
    clear(store_names: string[]) : Request;

    count(store_name: string, key_range?: any) : Request;
    count(store_name: string, index_name: string, key_range: any) : Request;
    count(store_names: string[]) : Request;

    executeSql(sql: string, params?: any[]) : Request;

    from(store_name: string) : Query;
    from(store_name: string, op: Op, value: any) : Query;
    from(store_name: string, op: Op, value: any, op2: Op, value2: any) : Query;

    get(store_name: string, key: any) : Request;

    keys(iter: Iterator, limit?: number) : Request;
    keys(store_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: bool) : Request;
    keys(store_name: string, index_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: bool) : Request;
    keys(store_name: string, limit?: bool, offset?: number) : Request;

    open(next_callback: (cursor: ICursor) => any, iterator: Iterator, mode: TransactionMode) : Request;

    put(store_name: string, value: any, key: any) : Request;
    put(store_name: string, value: any[], key: any[]) : Request;
    put(store_name: string, value: any) : Request;
    put(store_name: string, value: any[]) : Request;

    remove(store_name: string, id_or_key_range: any) : Request;
    remove(store_name: string, index_name: string, id_or_key_range: any) : Request;
    clear(store_name: string, key_or_key_range: any) : Request;

    scan(solver: (keys: any[], values: any[]) => any, iterators: Iterator[]) : Request;

    values(iter: Iterator, limit?: number) : Request;
    values(store_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: bool) : Request;
    values(store_name: string, index_name: string, key_range?: Object, limit?: number, offset?: number, reverse?: bool) : Request;
    values(store_name: string, ids?: Array) : Request;
    values(keys?: Array) : Request;
  }

  export class Storage extends DbOperator {

    constructor(db_name?:string, schema?: DatabaseSchemaJson, options?: StorageOptions);

    addEventListener(type: EventType, handler: (event: any) => void, capture?: bool);
    addEventListener(type: EventType[], handler: (event: any) => void, capture?: bool);

    branch (thread: Policy, isSerial: bool, scope: string[], mode: TransactionMode, maxRequest: number): DbOperator;

    close();

    get(store_name: string, key: any) : Request;

    getName (callback) : string;

    getSchema (callback) : DatabaseSchemaJson;

    getType(): string;

    onReady (Error?);

    removeEventListener(type: EventType, handler: (event: any) => void, capture?: bool);
    removeEventListener(type: EventType[], handler: (event: any) => void, capture?: bool);

    run(callback: (iStorage: ydn.db.Storage) => void, store_names: string[], mode: TransactionMode) : Request;

    search(catalog_name: string) : Request;

    setName(name: string);

    transaction(callback: (tx: any) => void, store_names: string[], mode: TransactionMode, completed_handler: (type:string, e?: Error) => void);

  }
}

declare module ydb.db.algo {

  export class Solver {

  }

  export class NestedLoop extends Solver {
    constructor(out:{push: (value:any) => void}, limit?:number);
  }

  export class SortedMerge extends Solver {
    constructor(out:{push: (value:any) => void}, limit?:number);
  }

  export class ZigzagMerge extends Solver {
    constructor(out:{push: (value:any) => void}, limit?:number);
  }

}

declare module ydn.db.events {

  export class Event {

    name: string;

    type: ydn.db.EventType;
  }

  export class RecordEvent extends Event {

    getStoreName(): string;

    getKey(): any;

    getValue(): any;
  }


  export class StorageEvent extends Event {

    getError(): Error;

    getVersion(): number;

    getOldVersion(): number;
  }


  export class StoreEvent extends Event {

    getStoreName(): string;

    getKeys(): any[];

    getValues(): any[];
  }
}
