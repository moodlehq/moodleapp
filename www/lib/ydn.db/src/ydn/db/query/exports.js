/**
 * @fileoverview About this file
 */

goog.provide('ydn.db.query.exports');
goog.require('ydn.db.Query');
goog.require('ydn.db.core.Storage');
goog.require('ydn.db.query.ConjunctionCursor');


goog.exportProperty(ydn.db.Query.prototype, 'copy',
    ydn.db.Query.prototype.copy);
goog.exportProperty(ydn.db.Query.prototype, 'count',
    ydn.db.Query.prototype.count);
goog.exportProperty(ydn.db.Query.prototype, 'list',
    ydn.db.Query.prototype.list);
goog.exportProperty(ydn.db.Query.prototype, 'order',
    ydn.db.Query.prototype.order);
goog.exportProperty(ydn.db.Query.prototype, 'patch',
    ydn.db.Query.prototype.patch);
goog.exportProperty(ydn.db.Query.prototype, 'reverse',
    ydn.db.Query.prototype.reverse);
goog.exportProperty(ydn.db.Query.prototype, 'unique',
    ydn.db.Query.prototype.unique);
goog.exportProperty(ydn.db.Query.prototype, 'where',
    ydn.db.Query.prototype.where);

goog.exportProperty(ydn.db.core.Storage.prototype, 'from',
    ydn.db.core.Storage.prototype.from);
goog.exportProperty(ydn.db.core.DbOperator.prototype, 'from',
    ydn.db.core.DbOperator.prototype.from);

goog.exportProperty(ydn.db.query.ConjunctionCursor.prototype, 'getKey',
    ydn.db.query.ConjunctionCursor.prototype.getKey);
goog.exportProperty(ydn.db.query.ConjunctionCursor.prototype, 'getPrimaryKey',
    ydn.db.query.ConjunctionCursor.prototype.getPrimaryKey);
goog.exportProperty(ydn.db.query.ConjunctionCursor.prototype, 'getValue',
    ydn.db.query.ConjunctionCursor.prototype.getValue);
goog.exportProperty(ydn.db.query.ConjunctionCursor.prototype, 'update',
    ydn.db.query.ConjunctionCursor.prototype.update);
goog.exportProperty(ydn.db.query.ConjunctionCursor.prototype, 'clear',
    ydn.db.query.ConjunctionCursor.prototype.clear);
