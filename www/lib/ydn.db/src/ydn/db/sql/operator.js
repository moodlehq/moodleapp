/**
* @fileoverview Provide iteration query.
*
*
*/


goog.provide('ydn.db.sql.DbOperator');
goog.require('ydn.db.Iterator');
goog.require('ydn.db.core.DbOperator');
goog.require('ydn.db.sql.IStorage');
goog.require('ydn.db.sql.req.IRequestExecutor');
goog.require('ydn.db.sql.req.IndexedDb');
goog.require('ydn.db.sql.req.WebSql');
goog.require('ydn.db.sql.req.SimpleStore');
goog.require('ydn.debug.error.ArgumentException');



/**
 * Construct storage to execute CRUD database operations.
 *
 * Execution database operation is atomic, if a new transaction require,
 * otherwise existing transaction is used and the operation become part of
 * the existing transaction. A new transaction is required if the transaction
 * is not active or locked. Active transaction can be locked by using
 * mutex.
 *
 * @param {!ydn.db.crud.Storage} storage base storage object.
 * @param {!ydn.db.schema.Database} schema
 * @param {ydn.db.tr.Thread} thread
 * @param {ydn.db.tr.Thread} sync_thread
 * @constructor
 * @implements {ydn.db.sql.IStorage}
 * @extends {ydn.db.core.DbOperator}
*/
ydn.db.sql.DbOperator = function(storage, schema, thread, sync_thread) {
  goog.base(this, storage, schema, thread, sync_thread);
};
goog.inherits(ydn.db.sql.DbOperator, ydn.db.core.DbOperator);


//
///**
// * Explain query plan.
// * @param {!ydn.db.Iterator} q
// * @return {Object} plan in JSON
// */
//ydn.db.sql.DbOperator.prototype.explain = function (q) {
//  if (!this.executor) {
//    return {'error':'database not ready'};
//  } else if (q instanceof ydn.db.Sql) {
//    return this.getExecutor().explainSql(q);
//  } else {
//    throw new ydn.error.ArgumentException();
//  }
//};
/**
 * @param {string} sql SQL statement.
 * @param {!Array=} opt_params SQL parameters.
 * @return {!ydn.db.Request} return result as list.
*/
ydn.db.sql.DbOperator.prototype.executeSql = function(sql, opt_params) {

  var query = new ydn.db.Sql(sql);

  var stores = query.getStoreNames();
  for (var i = 0; i < stores.length; i++) {
    var store = this.schema.getStore(stores[i]);
    if (!store) {
      throw new ydn.debug.error.ArgumentException('store: ' + store +
          ' not exists.');
    }
  }

  goog.log.finer(this.logger, 'executeSql: ' + sql + ' params: ' + opt_params);
  var req = this.tx_thread.request(ydn.db.Request.Method.SQL,
      query.getStoreNames(), query.getMode());
  req.addTxback(function() {
    this.getExecutor().executeSql(req, query, opt_params || []);
  }, this);

  return req;
};




