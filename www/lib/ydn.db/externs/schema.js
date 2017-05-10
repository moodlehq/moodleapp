

/**
 * @fileoverview Schema format.
 *
 * @externs
 */



/**
 * Inverted index for full text serach.
 * @constructor
 */
function InvIndex() {}


/**
 * @type {string}
 */
InvIndex.prototype.storeName;


/**
 * @type {string}
 */
InvIndex.prototype.keyPath;


/**
 * @type {number?}
 */
InvIndex.prototype.weight;



/**
 * @constructor
 */
function FullTextSearchResultToken() {}


/**
 * @type {string}
 */
FullTextSearchResultToken.prototype.keyPath;


/**
 * @type {string}
 */
FullTextSearchResultToken.prototype.value;


/**
 * @type {number}
 */
FullTextSearchResultToken.prototype.loc;



/**
 * @constructor
 */
function FullTextSearchResult() {}


/**
 * @type {string}
 */
FullTextSearchResult.prototype.storeName;


/**
 * @type {IDBKey}
 */
FullTextSearchResult.prototype.primaryKey;


/**
 * @type {number}
 */
FullTextSearchResult.prototype.score;


/**
 * @type {Array<FullTextSearchResultToken>}
 */
FullTextSearchResult.prototype.tokens;



/**
 * @constructor
 */
function FullTextCatalog() {}


/**
 * @type {string}
 */
FullTextCatalog.prototype.name;


/**
 * @type {Array.<InvIndex>}
 */
FullTextCatalog.prototype.sources;


/**
 * @type {string}
 */
FullTextCatalog.prototype.lang;


/**
 * @type {Array.<string>}
 */
FullTextCatalog.prototype.normalizers;



/**
 * @constructor
 */
function IndexSchema() {}


/**
 * @type {string}
 */
IndexSchema.prototype.name;


/**
 * @type {string}
 */
IndexSchema.prototype.type;


/**
 * @type {boolean}
 */
IndexSchema.prototype.unique;


/**
 * @type {string}
 */
IndexSchema.prototype.keyPath;


/**
 * @type {boolean}
 */
IndexSchema.prototype.multiEntry;


/**
 * Index key generator. Generator function will be invoked when a record value
 * is about to 'add' or 'put' to the object store. Returning a valid IDBKey
 * or undefined will set to the record value while ignoring invalid IDBKeys.
 * @type {Function}
 */
IndexSchema.prototype.generator;



/**
 * @constructor
 */
var KeyPaths = function() {};


/**
 * @type {string}
 */
KeyPaths.prototype.id;


/**
 * @type {string}
 */
KeyPaths.prototype.etag;


/**
 * @type {string}
 */
KeyPaths.prototype.nextUrl;


/**
 * @type {string}
 */
KeyPaths.prototype.updated;


/**
 * @constructor
 */
var AtomOptions = function() {};



/**
 * @see http://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGET.html
 * @constructor
 */
var S3Options = function() {};


/**
 * @type {string?}
 */
S3Options.prototype.delimiter;


/**
 * @type {string?}
 */
S3Options.prototype.prefix;


/**
 * Bucket name.
 * @type {string}
 */
S3Options.prototype.bucket;


/**
 * @type {?string}
 */
S3Options.prototype.maxKeys;



/**
 * @extends {AtomOptions}
 * @constructor
 */
var GDataOptions = function() {};


/**
 * @type {?string}
 */
GDataOptions.prototype.version;


/**
 * @type {string}
 */
GDataOptions.prototype.kind;


/**
 * @type {string?}
 */
GDataOptions.prototype.projection;


/**
 * Maximum number of results to be retrieved
 * https://developers.google.com/gdata/docs/2.0/reference#Queries
 * @type {string}
 */
GDataOptions.prototype.maxResults;


/**
 * @type {string}
 */
GDataOptions.prototype.domain;


/**
 * @type {string}
 */
GDataOptions.prototype.siteName;



/**
 * @extends {GDataOptions}
 * @constructor
 */
var GDataJsonOptions = function() {};


/**
 * Base uri path post fix. This can be found in "path" of resources method in
 * Google API discovery.
 * @type {string}
 */
GDataJsonOptions.prototype.prefix;



/**
 * @extends {AtomOptions}
 * @constructor
 */
var ODataOptions = function() {};



/**
 * Synchronization option for a store.
 * @constructor
 */
function StoreSyncOptionJson() {}


/**
 * Backend service format. Valid values are 'rest', 's3', 'gcs', 'atom',
 * 'odata', 'gdata'.
 * @type {string}
 */
StoreSyncOptionJson.prototype.format;


/**
 * Base URI.
 * @type {string}
 */
StoreSyncOptionJson.prototype.baseUri;


/**
 * Immutable database.
 * @type {boolean}
 */
StoreSyncOptionJson.prototype.immutable;


/**
 * HTTP transport. This is compatible with Google Javascript Client request
 * https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiclientrequest
 * @type {{request: Function}}
 */
StoreSyncOptionJson.prototype.transport;


/**
 * By default, meta data store are stripped, when read from the database.
 * @type {boolean} Set true to keep meta data.
 */
StoreSyncOptionJson.prototype.keepMeta;


/**
 * Store name which store meta data.
 * If specified, metaData must not specified.
 * @type {string}
 */
StoreSyncOptionJson.prototype.metaStoreName;


/**
 * Meta data data field if it is recorded inline.
 * If specified, metaStoreName must not specified.
 * @type {string}
 */
StoreSyncOptionJson.prototype.metaDataName;


/**
 * Key paths of metadata.
 * @type {{
 *   date: string,
 *   etag: string,
 *   expires: string,
 *   key: string,
 *   updated: string
 * }?}
 */
StoreSyncOptionJson.prototype.metaData;


/**
 * Indicate prefetch to be performed.
 * @type {string} valid options are 'meta' and 'full'.
 */
StoreSyncOptionJson.prototype.prefetch;


/**
 * Prefetch refractory period interval in milliseconds.
 * @type {number}
 */
StoreSyncOptionJson.prototype.prefetchRefractoryPeriod;


/**
 * Backend specific sync options.
 * @type {AtomOptions|GDataOptions|ODataOptions|S3Options}
 */
StoreSyncOptionJson.prototype.Options;


/**
 * Entry list fetch strategy. Supported method are
 * ['last-updated', 'descending-key']
 * @type {Array}
 */
StoreSyncOptionJson.prototype.fetchStrategies;



/**
 * @constructor
 */
function StoreSchema() {}


/**
 * @type {string}
 */
StoreSchema.prototype.name;


/**
 * @type {string}
 */
StoreSchema.prototype.keyPath;


/**
 * @type {boolean}
 */
StoreSchema.prototype.autoIncrement;


/**
 * @type {string}
 */
StoreSchema.prototype.type;


/**
 * @type {boolean|undefined}
 */
StoreSchema.prototype.encrypted;


/**
 * @type {Array.<!IndexSchema>}
 */
StoreSchema.prototype.indexes;


/**
 * @type {boolean}
 */
StoreSchema.prototype.dispatchEvents;


/**
 * A fixed schema.
 * @type {boolean}
 */
StoreSchema.prototype.fixed;


/**
 * Name of sync
 * @type {StoreSyncOptionJson}
 */
StoreSchema.prototype.Sync;



/**
 * @constructor
 */
function MetaData() {}


/**
 * @type {string}
 */
MetaData.prototype.id;


/**
 * @type {string}
 */
MetaData.prototype.etag;


/**
 * @type {number}
 */
MetaData.prototype.updated;


/**
 * @type {number}
 */
MetaData.prototype.expires;


/**
 * @type {number}
 */
MetaData.prototype.date;



/**
 * @constructor
 */
function DatabaseSchema() {}


/**
 * @type {number}
 */
DatabaseSchema.prototype.version;


/**
 * @type {Array.<!FullTextCatalog>}
 */
DatabaseSchema.prototype.fullTextCatalogs;


/**
 * @type {Array.<!StoreSchema>}
 */
DatabaseSchema.prototype.stores;

