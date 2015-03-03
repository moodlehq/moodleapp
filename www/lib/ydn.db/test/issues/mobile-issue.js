/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 8/12/12
 */

ydn.debug.log('ydn.debug');

ydn.debug.logger.info('testing debug log');

ydn.debug.logger.info('webkitIDBRequest ' + !!goog.global.webkitIDBRequest);
ydn.debug.logger.info('IDBRequest ' + !!goog.global.IDBRequest);
ydn.debug.logger.info('loading in webkitIDBRequest ' + !!('LOADING' in goog.global.webkitIDBRequest));
ydn.debug.logger.info('webkitIDBTransaction ' + !!goog.global.webkitIDBTransaction)
ydn.debug.logger.info('IDBTransaction ' + !!goog.global.IDBTransaction);
ydn.debug.logger.info('loading in IDBRequest ' + (!!goog.global.IDBRequest && 'LOADING' in goog.global.IDBRequest));


ydn.debug.logger.info('READ_WRITE ' + ydn.db.base.TransactionMode.READ_WRITE);








