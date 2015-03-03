/**
 * @fileoverview Exports for ydn-db crud module.
 *
 */

goog.provide('ydn.db.crud.exports');
goog.require('ydn.db.Key');
goog.require('ydn.db.KeyRange');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.db.tr.exports');


goog.exportProperty(ydn.db.crud.Storage.prototype, 'branch',
    ydn.db.crud.Storage.prototype.branch);

goog.exportProperty(ydn.db.crud.Storage.prototype, 'add',
    ydn.db.crud.Storage.prototype.add);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'get',
    ydn.db.crud.Storage.prototype.get);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'keys',
    ydn.db.crud.Storage.prototype.keys);
//goog.exportProperty(ydn.db.crud.Storage.prototype, 'load',
//  ydn.db.crud.Storage.prototype.load);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'values',
    ydn.db.crud.Storage.prototype.values);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'put',
    ydn.db.crud.Storage.prototype.put);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'clear',
    ydn.db.crud.Storage.prototype.clear);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'remove',
    ydn.db.crud.Storage.prototype.remove);
goog.exportProperty(ydn.db.crud.Storage.prototype, 'count',
    ydn.db.crud.Storage.prototype.count);

goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'add',
    ydn.db.crud.DbOperator.prototype.add);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'get',
    ydn.db.crud.DbOperator.prototype.get);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'keys',
    ydn.db.crud.DbOperator.prototype.keys);
//goog.exportProperty(ydn.db.crud.Storage.prototype, 'load',
//  ydn.db.crud.Storage.prototype.load);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'values',
    ydn.db.crud.DbOperator.prototype.values);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'put',
    ydn.db.crud.DbOperator.prototype.put);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'clear',
    ydn.db.crud.DbOperator.prototype.clear);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'remove',
    ydn.db.crud.DbOperator.prototype.remove);
goog.exportProperty(ydn.db.crud.DbOperator.prototype, 'count',
    ydn.db.crud.DbOperator.prototype.count);


goog.exportSymbol('ydn.db.Key', ydn.db.Key);
goog.exportProperty(ydn.db.Key.prototype, 'id', ydn.db.Key.prototype.getId);
goog.exportProperty(ydn.db.Key.prototype, 'parent',
    ydn.db.Key.prototype.getParent);
goog.exportProperty(ydn.db.Key.prototype, 'storeName',
    ydn.db.Key.prototype.getStoreName);


goog.exportSymbol('ydn.db.KeyRange', ydn.db.KeyRange);
goog.exportProperty(ydn.db.KeyRange, 'upperBound', ydn.db.KeyRange.upperBound);
goog.exportProperty(ydn.db.KeyRange, 'lowerBound', ydn.db.KeyRange.lowerBound);
goog.exportProperty(ydn.db.KeyRange, 'bound', ydn.db.KeyRange.bound);
goog.exportProperty(ydn.db.KeyRange, 'only', ydn.db.KeyRange.only);
goog.exportProperty(ydn.db.KeyRange, 'starts', ydn.db.KeyRange.starts);


goog.exportProperty(ydn.db.events.Event.prototype, 'store_name',
    ydn.db.events.Event.prototype.store_name); // this don't work, why?
goog.exportProperty(ydn.db.events.Event.prototype, 'getStoreName',
    ydn.db.events.Event.prototype.getStoreName);

goog.exportProperty(ydn.db.events.RecordEvent.prototype, 'name',
    ydn.db.events.RecordEvent.prototype.name);
goog.exportProperty(ydn.db.events.RecordEvent.prototype, 'getKey',
    ydn.db.events.RecordEvent.prototype.getKey);
goog.exportProperty(ydn.db.events.RecordEvent.prototype, 'getValue',
    ydn.db.events.RecordEvent.prototype.getValue);


goog.exportProperty(ydn.db.events.StoreEvent.prototype, 'name',
    ydn.db.events.StoreEvent.prototype.name);
goog.exportProperty(ydn.db.events.StoreEvent.prototype, 'getKeys',
    ydn.db.events.StoreEvent.prototype.getKeys);
goog.exportProperty(ydn.db.events.StoreEvent.prototype, 'getValues',
    ydn.db.events.StoreEvent.prototype.getValues);


