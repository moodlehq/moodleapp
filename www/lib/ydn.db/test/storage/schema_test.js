
goog.require('goog.debug.Console');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('ydn.db');
goog.require('ydn.db.crud.Storage');
goog.require('ydn.debug');


var reachedFinalContinuation, schema, debug_console;



var setUp = function() {
  // ydn.debug.log('ydn.db.con', 'finest');
  //ydn.db.con.IndexedDb.DEBUG = true;
  //ydn.db.con.IndexedDb.DEBUG = true;
  reachedFinalContinuation = false;

};

var tearDown = function() {
  assertTrue('The final continuation was not reached', reachedFinalContinuation);
};

var test_auto_schema = function() {

  var db_name = 'test_' + Math.random();
  // autoSchema database
  var db = new ydn.db.crud.Storage(db_name, undefined, options);
  var sh = db.getSchema();
  assertEquals('no store', 0, sh.stores.length);
  assertUndefined('auto schema', sh.version);
  var table_name = 'st1';
  var store_schema = {'name': table_name, 'keyPath': 'id', 'type': 'TEXT'};

  var hasEventFired = false;
  var result;
  var value = 'a' + Math.random();

  waitForCondition(
    // Condition
    function() { return hasEventFired; },
    // Continuation
    function() {
      assertEquals('get back', value, result);
      // Remember, the state of this boolean will be tested in tearDown().
      reachedFinalContinuation = true;
      ydn.db.deleteDatabase(db.getName(), db.getType());
      db.close();
    },
    100, // interval
    2000); // maxTimeout

  db.put(store_schema, {id: 'a', value: value, remark: 'put test'}).addCallback(function(y) {
    // console.log('put key ' + y);

    db.get(table_name, 'a').addCallback(function(x) {
      result = x.value;
      hasEventFired = true;
    });
  }).addErrback(function(e) {
      hasEventFired = true;
      console.log('Error: ' + e);
    });
};

var version_change_test_count = 0;

var version_change_test = function(schema1, schema2, is_final, msg, hint_sql, hint_idb) {
  var db_name = 'test' + Math.random();
  msg = msg || '';

  var ver, oldVer, ver2, oldVer2, ex_schema1, ex_schema2;
  var done = false;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        assertNotNaN(msg + 'change_test version 1', ver);
        assertNaN(msg + 'change_test old version 1', oldVer);
        assertEquals(msg + 'change_test version 2', (ver + 1), ver2);
        assertEquals(msg + 'change_test old version 2', ver, oldVer2);
        var s1 = new ydn.db.schema.Database(schema1);
        var msg1 = s1.difference(ex_schema1, !!hint_sql, !!hint_idb);
        assertTrue(msg + ' schema 1 ' + msg1, !msg1);
        //console.log(schema2);
        //console.log(ex_schema2);
        var s2 = new ydn.db.schema.Database(schema2);
        var msg2 = s2.difference(ex_schema2);
        assertTrue(msg + ' schema 2 ' + msg2, !msg2);
        if (is_final) {
          reachedFinalContinuation = true;
        }

      },
      100, // interval
      3000); // maxTimeout


  var db = new ydn.db.crud.Storage(db_name, schema1, options);
  db.addEventListener('ready', function(e) {
    ver = e.getVersion();
    oldVer = e.getOldVersion();
    // console.log(ver, oldVer);
    db.getSchema(function(x) {
      ex_schema1 = new ydn.db.schema.Database(x);
      // console.log(ex_schema1);
      db.close();
      setTimeout(function() {
        var db2 = new ydn.db.crud.Storage(db_name, schema2, options);
        db2.addEventListener('ready', function(e) {
          ver2 = e.getVersion();
          oldVer2 = e.getOldVersion();
          // console.log(ver2, oldVer2);
          db2.getSchema(function(x) {
            ex_schema2 = new ydn.db.schema.Database(x);
            // console.log(ex_schema2);
            ydn.db.deleteDatabase(db2.getName(), db2.getType());
            db2.close();
            done = true;
          });
        });
      }, 200);
    });
  });
};


var test_add_store = function() {
  var schema1 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st'
      },
      {
        name: 'st2'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var test_remove_store = function() {
  var schema2 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema1 = {
    stores: [
      {
        name: 'st'
      },
      {
        name: 'st2'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var test_rename_store = function() {
  var schema2 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema1 = {
    stores: [
      {
        name: 'st2'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var test_out_of_line_to_in_line_key = function() {
  var schema1 = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st',
        keyPath: 'id'
      }
    ]
  };
  version_change_test(schema1, schema2, true);
};

var version_unchange_test = function(schema, is_final, msg) {
  var db_name = 'test' + Math.random();
  msg = msg || '';

  var ver, oldVer, ver2, oldVer2;
  var done = false;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        // console.log([ver, oldVer, ver2, oldVer2]);
        assertNotNaN(msg + 'unchange_test version 1', ver);
        assertNaN(msg + 'unchange_test old version 1', oldVer);
        assertEquals(msg + 'unchange_test version 2, no change', ver, ver2);
        assertEquals(msg + 'unchange_test old version 2, no change', ver, oldVer2);

        if (is_final) {
          reachedFinalContinuation = true;
        }

      },
      100, // interval
      2000); // maxTimeout

  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.addEventListener('ready', function(e) {
    ver = e.getVersion();
    oldVer = e.getOldVersion();
    db.close();
    setTimeout(function() {
      var db2 = new ydn.db.crud.Storage(db_name, schema, options);
      db2.addEventListener('ready', function(e) {
        ver2 = e.getVersion();
        oldVer2 = e.getOldVersion();
        ydn.db.deleteDatabase(db2.getName(), db2.getType());
        db2.close();
        done = true;
      });
    }, 200);
  });
};

var test_keyPath = function() {

  var schema = {
    stores: [
      {
        name: 'st'
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st',
        keyPath: 'id',
        type: 'TEXT'
      }
    ]
  };
  version_unchange_test(schema);
  version_unchange_test(schema2);
  version_change_test(schema, schema2);
  version_change_test(schema2, schema, true);
};

var test_multiEntry = function() {

  var schema = {
    stores: [
      {
        name: 'st',
        indexes: [{
          name: 'idx',
          type: 'TEXT'
        }]
      }
    ]
  };
  var schema2 = {
    stores: [
      {
        name: 'st',
        indexes: [{
          name: 'idx',
          type: 'TEXT',
          multiEntry: true
        }]
      }
    ]
  };

  //version_change_test(schema2, schema, false, 'from multiEntry');
  //version_change_test(schema, schema2, false, 'to multiEntry');

  //version_unchange_test(schema, false, 'multiEntry=false:');
  version_unchange_test(schema2, true, 'multiEntry=true:');
};

var test_key_path_index = function() {
  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'x',
        type: 'TEXT'
      }
    ]
  };

  var schema2 = {
    stores: [
      {
        name: 'st',
        indexes: [{
          name: 'y'
        }]
      }
    ]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  version_change_test(schema, schema2, false, '3:');
  version_change_test(schema2, schema, true, '4:');
};

var test_composite_key_schema = function() {

  var schema = {
    stores: [
      {
        name: 'st',
        keyPath: 'x',
        type: 'TEXT'
      }
    ]
  };

  var schema2 = {
    stores: [
      {
        name: 'st',
        keyPath: ['x', 'y']
      }
    ]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  version_change_test(schema, schema2, false, '3:');
  version_change_test(schema2, schema, true, '4:');
};


var test_composite_index_schema = function() {

  if (options.mechanisms[0] == 'websql') {
    // fixme: known issue
    reachedFinalContinuation = true;
    return;
  }

  var schema = {
    stores: [{
      name: 'st',
      indexes: [{
        name: 'xy',
        keyPath: 'x'
      }]
    }]
  };

  var schema2 = {
    stores: [{
      name: 'st',
      indexes: [{
        name: 'xy',
        keyPath: ['x', 'y']
      }]
    }]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  version_change_test(schema, schema2, false, '3:');
  version_change_test(schema2, schema, true, '4:');

};


var test_blob_column = function() {

  var schema = {
    stores: [{
      name: 'st',
      indexes: [{
        keyPath: 'x',
        type: 'BLOB'
      }]
    }]
  };

  var schema2 = {
    stores: [{
      name: 'st',
      indexes: [{
        name: 'y'
      }]
    }]
  };

  version_unchange_test(schema, false, '1:');
  version_unchange_test(schema2, false, '2:');
  if (options.mechanisms[0] == 'indexeddb') {
    version_change_test(schema, schema2, true, '3:', false, true);
    return;
  }
  version_change_test(schema2, schema, true, '4:');

};

var test_data_index_add = function() {
  if (options.mechanisms[0] != 'indexeddb') {
    reachedFinalContinuation = true;
    return;
  }
  // only work in IndexedDB
  var db_name = 'test_data_lost_index_add-1';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var data = [{
    id: 1,
    value: 2
  }, {
    id: 2,
    value: 1
  }, {
    id: 3,
    value: 2
  }];
  var keys, done;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        // console.log([ver, oldVer, ver2, oldVer2]);
        assertArrayEquals(keys, [1, 3]);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();

      },
      100, // interval
      5000); // maxTimeout

  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear('st');
  db.put('st', data);
  db.close();
  var schema2 = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  setTimeout(function() {
    // make time to close the database, before schema change.
    var db2 = new ydn.db.crud.Storage(db_name, schema2, options);
    db2.keys('st', 'value', ydn.db.KeyRange.only(2)).addBoth(function(x) {
      keys = x;
      done = true;
    });
  }, 1000);

};

var test_mutli_connection = function() {
  if (options.mechanisms[0] != 'indexeddb') {
    reachedFinalContinuation = true;
    return;
  }
  // only work in IndexedDB
  var db_name = 'test_mutli_connection-2';
  var schema = {
    stores: [{
      name: 'st',
      keyPath: 'id'
    }]
  };
  var data = [{
    id: 1,
    value: 2
  }, {
    id: 2,
    value: 1
  }, {
    id: 3,
    value: 2
  }];
  var keys, done, event_vc, event_fail;

  waitForCondition(
      // Condition
      function() { return done; },
      // Continuation
      function() {
        // console.log([ver, oldVer, ver2, oldVer2]);
        assertNotNullNorUndefined('version change event called', event_vc);
        assertNotNullNorUndefined('fail event called', event_fail);
        var e = event_fail.getError();
        assertEquals('fail event name', 'versionchange', e.name);
        assertArrayEquals(keys, [1, 3]);

        reachedFinalContinuation = true;
        ydn.db.deleteDatabase(db_name, options.mechanisms[0]);
        db.close();

      },
      100, // interval
      5000); // maxTimeout

  var db = new ydn.db.crud.Storage(db_name, schema, options);
  db.clear('st');

  var schema2 = {
    stores: [{
      name: 'st',
      keyPath: 'id',
      indexes: [{
        keyPath: 'value'
      }]
    }]
  };
  db.addEventListener('versionchange', function(e) {
    db.put('st', data);
    // console.log(e);
    event_vc = e;
  });
  db.addEventListener('fail', function(e) {
    // console.log(e);
    event_fail = e;
  });
  setTimeout(function() {
    // make time.
    var db2 = new ydn.db.crud.Storage(db_name, schema2, options);
    db2.keys('st', 'value', ydn.db.KeyRange.only(2)).addBoth(function(x) {
      keys = x;
      done = true;
    });
  }, 1000);
};


var testCase = new goog.testing.ContinuationTestCase();
testCase.autoDiscoverTests();
G_testRunner.initialize(testCase);



