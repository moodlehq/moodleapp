/**
 * @fileoverview Export variables for sync module.
 */

goog.provide('ydn.db.sync.entity.exports');
goog.require('ydn.db.sync.Entity');

goog.exportSymbol('ydn.db.sync.Entity', ydn.db.sync.Entity);
goog.exportProperty(ydn.db.sync.Entity, 'schema', ydn.db.base.entitySchema);
goog.exportProperty(ydn.db.sync.Entity.prototype, 'add',
    ydn.db.sync.Entity.prototype.add);
goog.exportProperty(ydn.db.sync.Entity.prototype, 'get',
    ydn.db.sync.Entity.prototype.get);
goog.exportProperty(ydn.db.sync.Entity.prototype, 'getName',
    ydn.db.sync.Entity.prototype.getName);

goog.exportProperty(ydn.db.sync.Entity.prototype, 'put',
    ydn.db.sync.Entity.prototype.put);
goog.exportProperty(ydn.db.sync.Entity.prototype, 'remove',
    ydn.db.sync.Entity.prototype.remove);
goog.exportProperty(ydn.db.sync.Entity.prototype, 'update',
    ydn.db.sync.Entity.prototype.update);

goog.exportProperty(ydn.db.core.Storage.prototype, 'entity',
    ydn.db.core.Storage.prototype.entity);

goog.exportProperty(goog.Disposable.prototype, 'dispose',
    goog.Disposable.prototype.dispose);
goog.exportProperty(goog.events.EventTarget.prototype, 'listen',
    goog.events.EventTarget.prototype.listen);
goog.exportProperty(goog.events.EventTarget.prototype, 'unlistenByKey',
    goog.events.EventTarget.prototype.unlistenByKey);


