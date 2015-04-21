/**
 * @fileoverview Exports events.
 *
 */


goog.provide('ydn.db.tr.events.exports');
goog.require('ydn.db.tr.events');


goog.exportProperty(ydn.db.tr.Storage.prototype, 'addEventListener',
    ydn.db.tr.Storage.prototype.addEventListener);
goog.exportProperty(ydn.db.tr.Storage.prototype, 'removeEventListener',
    ydn.db.tr.Storage.prototype.removeEventListener);
