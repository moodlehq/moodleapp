/**
 * @fileoverview Exports for ydn-db crud module.
 *
 */

goog.provide('ydn.db.sql.exports');
goog.require('ydn.db.sql.Storage');



goog.exportProperty(ydn.db.sql.Storage.prototype, 'executeSql',
    ydn.db.sql.Storage.prototype.executeSql);

goog.exportProperty(ydn.db.sql.DbOperator.prototype, 'executeSql',
    ydn.db.sql.DbOperator.prototype.executeSql);

//goog.exportSymbol('ydn.db.Storage', ydn.db.sql.Storage);
