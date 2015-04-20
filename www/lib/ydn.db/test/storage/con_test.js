
goog.require('goog.debug.Console');
goog.require('goog.testing.jsunit');
goog.require('ydn.debug');
goog.require('ydn.object');
goog.require('ydn.db.crud.Storage');


var reachedFinalContinuation, debug_console, db_name;
var store_name = 'st';


var setUp = function() {


  // ydn.db.con.IndexedDb.DEBUG = true;

  //ydn.db.con.WebSql.DEBUG = true;
  // ydn.debug.log('ydn.db', 'finest');
  db_name = 'test_db' + Math.random();

  store_schema = {name: store_name, keyPath: 'id'};

};


var tearDown = function() {
  assertTrue('The final continuation was not reached',
      reachedFinalContinuation);
};


var schema_test = function(schema, to_delete, name) {

  name = name || db_name;
  //console.log('testing schema: ' + JSON.stringify(schema));
  var db = new ydn.db.crud.Storage(name, schema, options);

  var version = schema.version;

  var done, value;
  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('val', 1, value);
      var sh = db.getSchema();
      //console.log(JSON.stringify(sh));
      assertEquals('version', version, sh.version);
      reachedFinalContinuation = true;
      if (to_delete) {
        var type = db.getType();
        db.close();
        ydn.db.deleteDatabase(name, type);
      }
    },
    100, // interval
    1000); // maxTimeout

  db.put(store_name, {'id': 1}).addCallback(function(ok) {
    value = ok;
    done = true;
  });
};


var trival_schema_test = function(dbname, cb) {
  var schema = {};

  var db = new ydn.db.crud.Storage(dbname, schema, options);
  var validated_schema = new ydn.db.schema.Database(db.getSchema());

  var done, act_schema;
  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {

      //console.log([act_schema, validated_schema]);
      var diff = validated_schema.difference(act_schema);
      assertTrue('version diff: ' + diff, diff.length == 0);
      cb()
    },
    100, // interval
    1000); // maxTimeout

  db.getSchema(function(v) {
    act_schema = new ydn.db.schema.Database(v);
    done = true;
  });

};

var test_trival_schema = function() {
  var trival_db_name = 'test_' + Math.random();
  trival_schema_test(trival_db_name, function() {
    trival_schema_test(trival_db_name, function() {
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(trival_db_name, options.mechanisms[0]);
    });
  });
};

var test_no_db = function() {
  var schema = {stores: [store_schema]};
  schema_test(schema, true, 'test_no_db' + Math.random());
};


var test_same_ver = function() {
  var schema = {version: 1, stores: [store_schema]};
  schema_test(schema, true, 'test_same' + Math.random());
};

var test_same_ver_diff_schema = function() {
  var new_store = {name: 'nst' + Math.random(), keyPath: 'id'};
  var schema = {version: 1, stores: [store_schema, new_store]};
  schema_test(schema, true, 'test_diff' + Math.random());
};


var test_ver_update = function() {
  var new_store = {name: 'nst' + Math.random(), keyPath: 'id'};
  var schema = {version: 2, stores: [store_schema, new_store]};
  schema_test(schema, true);
};


var test_add_store = function() {
  var done, sh_len;
  waitForCondition(
    // Condition
    function() { return done; },
    // Continuation
    function() {
      assertEquals('1 store', 1, sh_len);
      assertTrue('still auto schema', db.isAutoSchema());
      reachedFinalContinuation = true;

    },
    100, // interval
    1000); // maxTimeout

  var db_name = 'test_' + Math.random();
  // autoSchema database
  var db = new ydn.db.crud.Storage(db_name, undefined, options);
  var sh = db.getSchema();
  assertEquals('no store', 0, sh.stores.length);
  assertTrue('auto schema', db.isAutoSchema());
  var store_name = 'st' + Math.random();
  var store = {name: store_name, keyPath: 'id'};
  var v = Math.random();
  db.put(store, {id: 'a', value: v});
  db.getSchema(function(sh) {
    //console.log(sh);
    sh_len = sh.stores.length;
    done = true;
  });
};


/**
* Assert the two schema are similar
* @param {ydn.db.schema.Database} schema
* @param {DatabaseSchema} schema_json
*/
var assert_similar_schema = function(schema, schema_json) {
  //console.log(['testing ', schema, schema_json]);
  var stores = schema_json.stores || schema_json.stores;
  assertEquals('# stores', schema.stores.length, stores.length);
  for (var i = 0; i < schema.stores.length; i++) {
    var store = schema.stores[i];
    var store_json = stores[i];
    assertEquals(i + ': name', store.getName(), store_json.name);
    if (store_json.type && store.type) {
      assertEquals(i + ': type', store.getType(), store_json.type);
    }

    if (store.keyPath) {
      assertEquals(i + ': keyPath', store.keyPath, store_json.keyPath);
      if (goog.isDef(store.autoIncrement) && goog.isDef(store_json.autoIncrement)) {
        assertEquals(i + ': autoIncrementt', store.autoIncrement,
          store_json.autoIncrement);
      }
    }

    var indexes = store.Indexes || store.indexes;
    assertEquals('# indexes', store.indexes.length,
        indexes.length);

    for (var j = 0; j < store.indexes.length; j++) {
      var index = store.indexes[i];
      var index_json = indexes[i];
      assertEquals(i + ':' + j + ': index name', index.name, index_json.name);
      if (index_json.type) {
        assertEquals(i + ':' + j + ': index type', index.type, index_json.type);
      }
      assertEquals(i + ':' + j + ': index keyPath', index.keyPath, index_json.keyPath);
      assertEquals(i + ':' + j + ': index keyPath', index.multiEntry, index_json.multiEntry);
    }

  }
  //console.log('test OK');
};


var schema_sniff_test = function(schema) {

  var db_name = 'test_schema_' + Math.random();
  var db = new ydn.db.crud.Storage(db_name, schema, options);

  var schema_json = db.getSchema();

  var t1_fired = false;
  var sniff_schema;

  waitForCondition(
    // Condition
    function() { return t1_fired; },
    // Continuation
    function() {
      // console.log([schema_json, sniff_schema]);
      //assertTrue(schema.similar(sniff_schema));
      assert_similar_schema(new ydn.db.schema.Database(schema_json), sniff_schema);
      reachedFinalContinuation = true;
      var type = db.getType();
      db.close();
      ydn.db.deleteDatabase(db_name, type);

    },
    100, // interval
    1000); // maxTimeout

  db.getSchema(function(result) {
    sniff_schema = result;
    t1_fired = true;
  });
};


var test_schema_store = function() {
  var store1 = {
    name: 'st1',
    keyPath: 'id',
    autoIncrement: false,
    type: ydn.db.schema.DataType.NUMERIC
  };
  var store2 = {
    name: 'st2',
    keyPath: 'id',
    autoIncrement: true,
    type: ydn.db.schema.DataType.INTEGER
  };
  var store3 = {
    name: 'st3',
    keyPath: undefined,
    autoIncrement: false
  };
  var store4 = {
    name: 'st4',
    keyPath: undefined,
    autoIncrement: true
  };

  var schema = new ydn.db.schema.Database({stores: [store1, store2, store3, store4]});

  schema_sniff_test(schema);

};


var test_schema_index = function() {

  var index1 = {
    keyPath: 'id1',
    type: ydn.db.schema.DataType.TEXT,
    unique: false
  };
  var index2 = {
    keyPath: 'id2',
    type: ydn.db.schema.DataType.TEXT,
    unique: true
  };
  var index3 = {
    keyPath: 'id3',
    type: ydn.db.schema.DataType.TEXT,
    unique: false,
    multiEntry: true
  };
  var index4 = {
    keyPath: 'id4',
    type: ydn.db.schema.DataType.TEXT,
    unique: true,
    multiEntry: true
  };

  var store1 = {
    name: 'st1',
    keyPath: 'id',
    autoIncrement: false,
    type: ydn.db.schema.DataType.NUMERIC,
    indexes: [index1, index2, index3, index4]
  };
  var schema = new ydn.db.schema.Database({stores: [store1]});

  schema_sniff_test(schema);

};


var test_schema_compound_index = function() {

  var index1 = {
    name: 'id1-id2',
    keyPath: ['id1', 'id2'],
    unique: false
  };


  var store1 = {
    name: 'st1',
    keyPath: 'id',
    autoIncrement: false,
    type: ydn.db.schema.DataType.NUMERIC,
    indexes: [index1]
  };
  var schema = new ydn.db.schema.Database({stores: [store1]});

  schema_sniff_test(schema);

};


var test_fix_schema_ver_change = function() {

  var db_name = 'test_schema_' + Math.random();
  var schema1 = {
    version: 1,
    stores: [
      {
        name: 'st1'
      }
    ]
  };
  var schema2 = {
    version: 2,
    stores: [
      {
        name: 'st1'
      }, {
        name: 'st2'
      }
    ]
  };
  var db = new ydn.db.crud.Storage(db_name, schema1, options);

  var done = false;
  var sniff_schema1, sniff_schema2;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assert_similar_schema(new ydn.db.schema.Database(schema1),
            sniff_schema1);
        assert_similar_schema(new ydn.db.schema.Database(schema2),
            sniff_schema2);
        reachedFinalContinuation = true;

      },
      100, // interval
      1000); // maxTimeout

  db.getSchema(function(result) {
    // console.log(result);
    sniff_schema1 = result;
    db.close();
    setTimeout(function() {
      db = new ydn.db.crud.Storage(db_name, schema2, options);
      db.getSchema(function(result) {
        // console.log(result);
        sniff_schema2 = result;
        done = true;
        var type = db.getType();
        db.close();
        ydn.db.deleteDatabase(db_name, type);
      });
    }, 100);
  });

};

var test_onReady = function() {
  var db_name = 'test_onReady';
  var e1, e2, done1, done2;
  var schema1 = {
    version: 2,
    stores: [
      {
        name: 'st'
      }]
  };
  var schema2 = {
    version: 1,
    stores: [
      {
        name: 'st2'
      }]
  };
  var db =  new ydn.db.crud.Storage(db_name, schema1, options);
  db.onReady(function (x) {
    e1 = x;
    done1 = true;
    db.close();
    var db2 =  new ydn.db.crud.Storage(db_name, schema2, options);
    db2.onReady(function (x) {
      console.log(x);
      e2 = x;
      done2 = true;
      db2.close();
    });
  });

  waitForCondition(
      // Condition
      function() { return done1 && done2; },
      // Continuation
      function() {
        assertUndefined('event 1', e1);
        assertNotNullNorUndefined('event 2', e2);
        assertEquals('error event', 'error', e2.type);
        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, options.mechanisms[0]);
      },
      100, // interval
      3000); // maxTimeout
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



