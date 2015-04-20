

(function() {
  var db_name = 'test-crypt-1';
  var options = {
    Encryption: {
      secrets: [{
        name: 'aaaa',
        key: 'monkey'
      }]
    }
  };
  var options2 = {
    Encryption: {
      secrets: [{
        name: 'aaaa',
        key: 'monk'
      }]
    }
  };
  var schema = {stores: [
    {
      name: 'st',
      encrypted: true
    }
  ]};
  var obj = {
    'value': 'Hello'
  };
  var key = 'id' + Math.random();

  module('crypt,crud');
  reporter.createTestSuite('crypt');
  asyncTest('encryption and decription', 3, function() {
    var db = new ydn.db.Storage(db_name, schema, options);
    db.put('st', obj, key);
    db.close();
    db = new ydn.db.Storage(db_name, schema, options);
    db.get('st', key).always(function(v) {
      ok(v, 'got it');
      deepEqual(obj, v, 'encryption ok');
      db.close();
      db = new ydn.db.Storage(db_name, schema, options2);
      db.get('st', key).always(function(v) {
        console.log(v);
        ok(!v, 'not encrypted');
        ydn.db.deleteDatabase(db_name, db.getType());
        db.close();
        start();
      });
    });
  });

})();



