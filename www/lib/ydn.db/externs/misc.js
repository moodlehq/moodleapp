/**
 * @fileoverview Misc type
 *
 * @externs
 */



/**
 * Encryption option.
 * @constructor
 */
function EncryptionOption() {}


/**
 * @type {number|undefined}
 */
EncryptionOption.prototype.expiration;


/**
 * @type {boolean|undefined}
 */
EncryptionOption.prototype.encryptKey;


/**
 * @type {boolean|undefined}
 */
EncryptionOption.prototype.unsafeParse;


/**
 * @type {string|boolean|undefined}
 */
EncryptionOption.prototype.exposeKey;



/**
 * @type {string|undefined}
 */
EncryptionOption.prototype.method;



/**
 * Encryption option.
 * @constructor
 */
function EncryptionOptionSecret() {}


/**
 * @type {string}
 */
EncryptionOptionSecret.prototype.name;


/**
 * @type {string}
 */
EncryptionOptionSecret.prototype.key;


/**
 * @type {Array<EncryptionOptionSecret>}
 */
EncryptionOption.prototype.secrets;



/**
 * @constructor
 */
function StorageOptions() {}


/**
 * Estimated database size for WebSQL.
 * @type {number|undefined}
 */
StorageOptions.prototype.size;


/**
 * Preferential ordering of storage mechanisms.
 * @type {!Array.<string>|undefined}
 */
StorageOptions.prototype.mechanisms;


/**
 * @type {boolean}
 */
StorageOptions.prototype.autoSchema;


/**
 * @type {string|undefined}
 */
StorageOptions.prototype.policy;


/**
 * @type {boolean|undefined}
 */
StorageOptions.prototype.isSerial;


/**
 * @type {number|undefined}
 */
StorageOptions.prototype.connectionTimeout;



/**
 * @type {EncryptionOption}
 */
StorageOptions.prototype.Encryption;



/**
 * @constructor
 */
function KeyRangeJson() {}


/**
 * @type {number|string|!Date|!Array.<number|string|!Date>|undefined}
 */
KeyRangeJson.prototype.lower;


/**
 * @type {boolean}
 */
KeyRangeJson.prototype.lowerOpen;


/**
 * @type {number|string|!Date|!Array.<number|string|!Date>|undefined}
 */
KeyRangeJson.prototype.upper;


/**
 * @type {boolean}
 */
KeyRangeJson.prototype.upperOpen;


/**
 * @const
 * @type {Object}
 */
var DataSourceOption = {};



/**
 * @constructor
 */
var GDataSourceOption = function() {};


/**
 * @type {string}
 */
GDataSourceOption.prototype.kind;


/**
 * @type {string}
 */
GDataSourceOption.prototype.id;



/**
 * @constructor
 * @extends {GDataSourceOption}
 */
var ContactDataSourceOption = function() {};



/**
 * Record format for {@see ydn.debug.DbLogger}.
 * @interface.
 */
var DbLoggerRecord = function() {};


/** @type {string} */
DbLoggerRecord.prototype.exception;


/** @type {number} */
DbLoggerRecord.prototype.level;


/** @type {string} */
DbLoggerRecord.prototype.logger;


/** @type {string} */
DbLoggerRecord.prototype.name;


/** @type {number} */
DbLoggerRecord.prototype.time;


/** @type {string} */
DbLoggerRecord.prototype.message;


/** @type {number} */
DbLoggerRecord.prototype.seq;



/**
 * JSON format in result of db.search() query.
 * Stringify out put of ydn.db.schema.fulltext.Entry.
 * @constructor
 */
var DbFullTextSearchResult = function() {};



/**
 * @constructor
 */
DbFullTextSearchResult.Token = function() {};


/**
 * Keypath of token.
 * @type {string}
 */
DbFullTextSearchResult.Token.prototype.keyPath;


/**
 * Index of location of matching keyword in the document.
 * @type {!Array.<number>}
 */
DbFullTextSearchResult.Token.prototype.loc;


/**
 * Keyword from the document.
 * @type {string}
 */
DbFullTextSearchResult.Token.prototype.value;


/**
 * Primary key of the document, in which it was found.
 * @type {number|string|!Date|!Array.<number|string|!Date>}
 */
DbFullTextSearchResult.prototype.primaryKey;


/**
 * Matching score.
 * @type {number}
 */
DbFullTextSearchResult.prototype.score;


/**
 * Target store name.
 * @type {string}
 */
DbFullTextSearchResult.prototype.storeName;


/**
 * Search result.
 * @type {!Array.<DbFullTextSearchResult.Token>}
 */
DbFullTextSearchResult.prototype.tokens;


/**
 * Search value.
 * @type {string}
 */
DbFullTextSearchResult.prototype.value;


/**
 * Record value of given primaryKey from storeName object store. This value
 * is not set by search return result.
 * @type {*}
 */
DbFullTextSearchResult.prototype.record;




