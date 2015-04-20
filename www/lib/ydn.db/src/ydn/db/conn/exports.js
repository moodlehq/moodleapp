/**
 * @fileoverview Exports for ydn-db connection module.
 *
 * Exporting variable are defined in separate namespace so that closure
 * project can use this library without exporting any of ydn-db properties.
 * Project that want to export ydn-db properties should require this namespace.
 */


goog.provide('ydn.db.con.exports');
goog.require('ydn.base.exports');
goog.require('ydn.db');
goog.require('ydn.db.con.Storage');



// does not work for overridable function, use @expose instead
goog.exportProperty(ydn.db.con.Storage.prototype, 'close',
    ydn.db.con.Storage.prototype.close);
goog.exportProperty(ydn.db.con.Storage.prototype, 'getType',
    ydn.db.con.Storage.prototype.getType);
goog.exportProperty(ydn.db.con.Storage.prototype, 'getName',
    ydn.db.con.Storage.prototype.getName);
goog.exportProperty(ydn.db.con.Storage.prototype, 'getSchema',
    ydn.db.con.Storage.prototype.getSchema);
goog.exportProperty(ydn.db.con.Storage.prototype, 'onReady',
    ydn.db.con.Storage.prototype.onReady);
goog.exportProperty(ydn.db.con.Storage.prototype, 'setName',
    ydn.db.con.Storage.prototype.setName);
goog.exportProperty(ydn.db.con.Storage.prototype, 'transaction',
    ydn.db.con.Storage.prototype.transaction);

// for hacker only. This method should not document this, since this will change
// transaction state.
goog.exportProperty(ydn.db.con.Storage.prototype, 'db',
    ydn.db.con.Storage.prototype.getDbInstance);

goog.exportSymbol('ydn.db.version', ydn.db.version);
goog.exportSymbol('ydn.db.cmp', ydn.db.cmp);
goog.exportSymbol('ydn.db.deleteDatabase', ydn.db.deleteDatabase);

goog.exportProperty(ydn.db.events.StorageEvent.prototype, 'name',
    ydn.db.events.StorageEvent.prototype.name);
goog.exportProperty(ydn.db.events.StorageEvent.prototype, 'getVersion',
    ydn.db.events.StorageEvent.prototype.getVersion);
goog.exportProperty(ydn.db.events.StorageEvent.prototype, 'getOldVersion',
    ydn.db.events.StorageEvent.prototype.getOldVersion);
goog.exportProperty(ydn.db.events.StorageEvent.prototype, 'getOldSchema',
    ydn.db.events.StorageEvent.prototype.getOldSchema);
goog.exportProperty(ydn.db.events.StorageErrorEvent.prototype, 'getError',
    ydn.db.events.StorageErrorEvent.prototype.getError);

goog.exportProperty(ydn.db.Request.prototype, 'abort',
    ydn.db.Request.prototype.abort);
goog.exportProperty(ydn.db.Request.prototype, 'canAbort',
    ydn.db.Request.prototype.canAbort);
goog.exportProperty(ydn.db.Request.prototype, 'progress',
    ydn.db.Request.prototype.addProgback);
goog.exportProperty(ydn.db.Request.prototype, 'promise',
    ydn.db.Request.prototype.promise);



