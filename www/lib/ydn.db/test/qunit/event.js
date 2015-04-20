

(function () {


  var db;
  var db_name_event = "tck_test_1_1";
  var store_inline = "ts";    // in-line key store
  var store_outline = "ts2"; // out-of-line key store


  var events_schema = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        dispatchEvents: true,
        type: 'NUMERIC'},
      {
        name: store_outline,
        dispatchEvents: true,
        type: 'NUMERIC'}
    ]};

  var db_name_event = 'test_tb' + Math.random();
  db_name_event = db_name_event.replace('.', '');
  var schema = {stores: [
    {
      name: store_inline
    }
  ]};

  var test_env = {
    setup: function () {

    },
    teardown: function () {

    }
  };

  module("event,storage", test_env);
  reporter.createTestSuite('event');
  asyncTest("connected to a new database and existing", 12, function () {

    var db = new ydn.db.Storage(db_name_event, schema);

    db.addEventListener('ready', function (e) {
      equal(e.name, 'ReadyEvent', 'event name');
      equal(e.type, 'ready', 'event type');
      equal(e.getVersion(), 1, 'version number');
      ok(isNaN(e.getOldVersion()), 'old version number');

      db.values(store_inline).always(function () {

        db.close();

        db = new ydn.db.Storage(db_name_event, schema);

        db.addEventListener('ready', function (e) {
          equal(e.name, 'ReadyEvent', 'event name');
          equal(e.type, 'ready', 'event type');
          equal(e.getVersion(), 1, 'version number');
          equal(e.getOldVersion(), 1, 'old version number, existing');
          db.values(store_inline).always(function () {

            db.close();

            var tb_name = 'new_tb' + Math.random();
            tb_name = tb_name.replace('.', '');
            var new_schema = {stores: [
              {
                name: tb_name
              }
            ]};

            db = new ydn.db.Storage(db_name_event, new_schema);

            db.addEventListener('ready', function (e) {
              equal(e.name, 'ReadyEvent', 'event name');
              equal(e.type, 'ready', 'event type');
              equal(e.getVersion(), 2, 'updated version number');
              equal(e.getOldVersion(), 1, 'old version number, existing db, new schema');

              var type = db.getType();
              db.values(tb_name).always(function () { // make sure all run.
                db.close();
                ydn.db.deleteDatabase(db.getName(), type);
                start();
              });

            });
          });

        });
      });
    });

  });

})();


(function() {

  var db;
  var db_name_event = "tck_test_1_2";
  var store_inline = "ts";    // in-line key store
  var store_outline = "ts2"; // out-of-line key store


  var events_schema = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        dispatchEvents: true,
        type: 'NUMERIC'},
      {
        name: store_outline,
        dispatchEvents: true,
        type: 'NUMERIC'}
    ]};

  module('event,record');
  reporter.createTestSuite('event', 'record-event');
  asyncTest('created', 6, function() {
    var db_name_event = 'test-created-1';
    var db = new ydn.db.Storage(db_name_event, events_schema);

    var key = Math.ceil(Math.random() * 100000);
    var data = {test: 'random value', name: 'name ' + key, id: key};

    db.addEventListener('created', function(e) {
      //console.log(e);
      equal(e.type, 'created', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
    });

    db.addEventListener('updated', function(e) {
      //console.log(e);
      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      deepEqual(e.getValue(), data, 'value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();
    });

    db.add(store_inline, data).then(function(x) {
      // console.log(x);
    }, function(e) {
      throw e;
    });
    db.put(store_inline, data).then(function(x) {
      // console.log(x);
    }, function(e) {
      throw e;
    });

  });


  asyncTest("updated", 10, function () {

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var key = Math.ceil(Math.random() * 100000);
    var data = { test: "random value", name: "name " + key, id: key };

    var firedCreatedEvent = false;
    db.addEventListener(['created'], function (e) {
      //console.log(e);

      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
      firedCreatedEvent = true;

    });

    db.addEventListener(['updated'], function (e) {
      //console.log(e);

      equal(e.name, 'RecordEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      equal(e.getKey(), key, 'key');
      deepEqual(e.getValue(), data, 'value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();

    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });

})();


(function () {

  var db;
  var db_name_event = "tck_test_1_3";
  var store_inline = "ts";    // in-line key store
  var store_outline = "ts2"; // out-of-line key store


  var events_schema = {
    stores: [
      {
        name: store_inline,
        keyPath: 'id',
        dispatchEvents: true,
        type: 'NUMERIC'},
      {
        name: store_outline,
        dispatchEvents: true,
        type: 'NUMERIC'}
    ]};

  var test_env = {
    setup: function () {

    },
    teardown: function () {

    }
  };

  module("event,store", test_env);
  reporter.createTestSuite('event', 'store-event');
  asyncTest("created", 5, function () {

    var db = new ydn.db.Storage(db_name_event, events_schema);

    var keys = [Math.ceil(Math.random() * 100000),
      Math.ceil(Math.random() * 100000)];
    var data = [
      {name: "rand key 1", id: keys[0]},
      {name: "rand key 2", id: keys[1]}
    ];
    // console.log(data);

    db.addEventListener('created', function (e) {
      // console.log(e);
      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      deepEqual(e.getKeys(), keys, 'keys');
      deepEqual(e.getValues(), data, 'values');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();
    });

    db.add(store_inline, data).then(function(x) {
      // console.log(x);
    }, function(e) {
      throw e;
    });

  });


  asyncTest("updated", 10, function () {

    var db = new ydn.db.Storage(db_name_event, events_schema);
    var keys = [Math.ceil(Math.random() * 100000),
      Math.ceil(Math.random() * 100000)];
    var data = [
      {name: "rand key 1", id: keys[0]},
      {name: "rand key 2", id: keys[1]}
    ];

    var firedCreatedEvent = false;
    db.addEventListener(['created'], function (e) {
      //console.log(e);

      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'created', 'type');
      deepEqual(e.getKeys(), keys, 'created key');
      deepEqual(e.getValues(), data, 'created value');

    });

    db.addEventListener(['updated'], function (e) {
      //console.log(e);

      equal(e.name, 'StoreEvent', 'event name');
      equal(e.getStoreName(), store_inline, 'store name');
      //equal(e.store_name, store_inline, 'store name');
      equal(e.type, 'updated', 'type');
      deepEqual(e.getKeys(), keys, 'updated key');
      deepEqual(e.getValues(), data, 'updated value');
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db.getName(), type);
      start();

    });

    db.add(store_inline, data);
    db.put(store_inline, data);

  });

})();


(function () {
  var test_env = {
    setup: function () {

    },
    teardown: function () {

    }
  };

  module("event,error", test_env);
  reporter.createTestSuite('event', 'error');
  var db_name = 'test_constrained_error' + Math.random();
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'id',
        type: 'NUMERIC'
      }]
  };
  var db = new ydn.db.Storage(db_name, schema, options);
  var obj = {id: 1, value: 'v' + Math.random()};

  asyncTest("ConstraintError on adding existing key", 2, function () {
    db.add('st', obj).always(function (k) {
      equal(k, 1, 'key 1 added')
    });
    db.add('st', obj).then(function (x) {
      ok(false, 'should not add again with existing key');
      start();
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    }, function (e) {
      equal(e.name, 'ConstraintError', 'got ConstraintError');
      start();
      ydn.db.deleteDatabase(db_name, db.getType());
      db.close();
    });
  });

})();


