/**
 * @fileoverview Entity.
 *
 * @externs
 */



/**
 * @constructor
 */
function EntityService() {}


/**
 * Send HTTP GET request.
 * @param {function(number, !Object, ?string)} callback status code and result
 * @param {string} name entity name
 * @param {IDBKey} id entity id
 * @param {?string} token validator token
 */
EntityService.prototype.get = function(callback, name, id, token) {

};


/**
 * Write collection.
 * @param {function(number, !Object, IDBKey, ?string)} callback status code, validator and result
 * @param {IDBKey} name entity name
 * @param {Object} obj
 */
EntityService.prototype.add = function(callback, name, obj) {

};


/**
 * Write collection.
 * @param {function(number, !Object, IDBKey, ?string)} callback status code and result
 * @param {string} name entity name
 * @param {Object} obj entity value
 * @param {IDBKey} id entity id
 * @param {string} token validator token
 */
EntityService.prototype.put = function(callback, name, obj, id, token) {

};


/**
 * Write collection.
 * @param {function(number)} callback status code and result
 * @param {string} name entity name
 * @param {IDBKey} id entity id
 * @param {string} token validator token
 */
EntityService.prototype.remove = function(callback, name, id, token) {

};


/**
 * List collection.
 * @param {function(number, Array.<!Object>, ?string)} callback return nullable paging token and
 * list of entities. If paging token is not `null`, list method will be invoke again with given paging token.
 * @param {string} name entity name
 * @param {*} token paging token. If paging token is not provided, paging token should be
 * read from the database.
 */
EntityService.prototype.list = function(callback, name, token) {

};
