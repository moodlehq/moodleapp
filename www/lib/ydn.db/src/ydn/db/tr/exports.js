/**
 * @fileoverview Exports for transaction module.
 *
 */

goog.provide('ydn.db.tr.exports');
goog.require('ydn.db.tr.Storage');
goog.require('ydn.db.tr.DbOperator');


goog.exportProperty(ydn.db.tr.Storage.prototype, 'branch',
    ydn.db.tr.Storage.prototype.branch);
goog.exportProperty(ydn.db.tr.Storage.prototype, 'getTxNo',
    ydn.db.tr.Storage.prototype.getTxNo);
goog.exportProperty(ydn.db.tr.DbOperator.prototype, 'getTxNo',
    ydn.db.tr.DbOperator.prototype.getTxNo);
goog.exportProperty(ydn.db.tr.Storage.prototype, 'run',
    ydn.db.tr.Storage.prototype.run);


