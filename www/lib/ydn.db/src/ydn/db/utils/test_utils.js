/**
 * @fileoverview About this file.
 *
 * User: kyawtun
 * Date: 5/8/12
 */

goog.provide('ydn.db.test');
goog.require('ydn.db.Storage');
goog.require('goog.dom.pattern.AbstractPattern');


/**
 *
 * @type {string} store name.
 */
ydn.db.test.table = 't1';

/**
 * @return {!ydn.db.schema.Database} database schema.
 */
ydn.db.test.getSchema = function() {
  // var basic_schema = new ydn.db.schema.Database(1);
  // basic_schema.addStore(new ydn.db.schema.Store(ydn.db.test.table, 'id'));
  return new ydn.db.schema.Database({
    stores: [{
      name: 't1',
      keyPath: 'id'
    }]
  });
};


/**
 * @param queue test queue.
 * @param {ydn.db.Storage} db Database instance.
 */
ydn.db.test.db_clear_all_tests = function(queue, db) {

  queue.call('clear db', function(callbacks) {
    var df_clear = db.clear();
    df_clear.addCallback(callbacks.add(function(value) {
      assertTrue('clear OK', value);
    }));
  });

  queue.call('count', function(callbacks) {
    db.count().addCallback(callbacks.add(function(count) {
      assertEquals('count 0', 0, count);
    }));
  });
};


/**
 * @param queue test queue.
 * @param {ydn.db.Storage} db Database instance.
 */
ydn.db.test.clear_tests = function(queue, db) {

  var a_value = 'a' + Math.random();

  queue.call('put a', function(callbacks) {
    db.put(ydn.db.test.table, {id: 'a', value: a_value}).addCallback(callbacks.add(function(value) {
      assertEquals('put a', 'a', value);
    }));
  });

  queue.call('get a', function(callbacks) {
    db.get(ydn.db.test.table, 'a').addCallback(callbacks.add(function(value) {
      assertEquals('get a = ' + a_value, a_value, value.value);
    }));
  });

  queue.call('clear a', function(callbacks) {
    var df_clear = db.clear(ydn.db.test.table, 'a');
    df_clear.addCallback(callbacks.add(function(value) {
      assertEquals('clear OK', true, value);
    }));
  });

  queue.call('get a after clear', function(callbacks) {
    db.get(ydn.db.test.table, 'a').addCallback(callbacks.add(function(value) {
      assertUndefined('get a after clear', value);
    }));
  });
};


/**
 * Test put and get for basic object.
 * @param queue test queue.
 * @param {ydn.db.Storage} db Database instance.
 */
ydn.db.test.run_put_get_tests = function(queue, db) {

  queue.call('clear db before start', function(callbacks) {
    db.clear(ydn.db.test.table).addCallback(callbacks.add(function(value) {
      assertEquals('clear OK', 1, value);
    }));
  });

  queue.call('count after clear', function(callbacks) {
    db.count(ydn.db.test.table).addCallback(callbacks.add(function(count) {
      //console.log('starting count ' + count);
      assertEquals('start with 0', 0, count);
    }));
  });

  var a_value = 'a' + Math.random();

  queue.call('put a', function(callbacks) {
    db.put(ydn.db.test.table, {id: 'a', value: a_value}).addCallback(callbacks.add(function(value) {
      assertEquals('put a ' + a_value, 'a', value);
    }));
  });


  queue.call('get a', function(callbacks) {
    db.get(ydn.db.test.table, 'a').addCallback(callbacks.add(function(value) {
      assertEquals('get a = ' + a_value, a_value, value.value);
    }));
  });

  queue.call('count 1', function(callbacks) {
    db.count(ydn.db.test.table).addCallback(callbacks.add(function(count) {
      //console.log('new count ' + count);
      assertEquals('count 2', 1, count);
    }));
  });

  queue.call('put b', function(callbacks) {
    db.put(ydn.db.test.table, {id: 'b', value: '2'}).addCallback(callbacks.add(function(value) {
      assertEquals('put b 2', 'b', value);
    }));
  });

  queue.call('get b', function(callbacks) {
    db.get(ydn.db.test.table, 'b').addCallback(callbacks.add(function(value) {
      assertEquals('get b 2', '2', value.value);
    }));
  });

  queue.call('count', function(callbacks) {
    db.count(ydn.db.test.table).addCallback(callbacks.add(function(count) {
      //console.log('new count 2 ' + count);
      assertEquals('count 2', 2, count);
    }));
  });

  queue.call('update a', function(callbacks) {
    db.put(ydn.db.test.table, {id: 'a', value: '3'}).addCallback(callbacks.add(function(value) {
      assertEquals('put a 3', 'a', value);
    }));
  });

  queue.call('get updated a', function(callbacks) {
    db.get(ydn.db.test.table, 'a').addCallback(callbacks.add(function(value) {
      assertEquals('get a 3', '3', value.value);
    }));
  });

  queue.call('count again', function(callbacks) {
    db.count(ydn.db.test.table).addCallback(callbacks.add(function(count) {
      assertEquals('count again', 2, count);
    }));
  });

  //  queue.call('clear db', function(callbacks) {
  //    db.clear().addCallback(callbacks.add(function(value) {
  //      assertEquals('clear OK', true, value);
  //    }));
  //  });
  //
  //  queue.call('count', function(callbacks) {
  //    db.count().addCallback(callbacks.add(function(count) {
  //      assertEquals('count 0', 0, count);
  //    }));
  //  });
};


/**
 * Test key values and ensure that value is unchanged on put and get.
 * For IndexedDB, key value is DOMString
 * http://www.w3.org/TR/2011/WD-WebIDL-20110927/#idl-DOMString
 * The DOMString type corresponds to the set of all possible sequences of 16 bit unsigned integer code units.
 * @param queue test queue.
 * @param {ydn.db.Storage} db Database instance.
 */
ydn.db.test.special_keys_test = function(queue, db) {

  var test_key = function(key) {
    var key_value = 'a' + Math.random();
    queue.call('put ' + key, function(callbacks) {
      // goog.global.console.log('putting ' + key + key_value);
      db.put(ydn.db.test.table, {id: key, value: key_value}).addCallback(callbacks.add(function(value) {
        // goog.global.console.log('put ' + key + ' ' + value);
        assertEquals('put a 1', key, value);
      }));
    });

    queue.call('get ' + key, function(callbacks) {
      // goog.global.console.log('getting ' + key);
      db.get(ydn.db.test.table, key).addCallback(callbacks.add(function(value) {
        // goog.global.console.log('get ' + key + ' ' + value);
        assertEquals('get ' + key, key_value, value.value);
      }));
    });
  };

  test_key('x');

  var key = 't@som.com';
  test_key('t@som.com');
  test_key('http://www.ok.com');
  test_key('http://www.ok.com/ereom\ere#code?oer=ere');

};



/**
 * @param queue test queue.
 * @param {ydn.db.Storage} db Database instance.
 */
ydn.db.test.empty_store_get_test = function(queue, db) {
  var rand_key = 'k' + Math.random();
  queue.call('get non existing key: ' + rand_key, function(callbacks) {
    db.get(ydn.db.test.table, rand_key).addCallback(callbacks.add(function(value) {
      assertUndefined('result', value);
    }))
  });
};


/**
 * @return {DatabaseSchema} schema used in nested_key_path test.
 */
ydn.db.test.get_nested_key_path_schema = function() {
  // var store_name = 'nested_key_path';
  // var schema = new ydn.db.schema.Database(1);
  // schema.addStore(new ydn.db.schema.Store(store_name, 'id.$t'));
  return {
    stores: [{
      name: 'nested_key_path',
      keyPath: 'id.$t'
    }]
  };
};


/**
 * @param queue test queue.
 * @param {ydn.db.Storage} db Database instance.
 */
ydn.db.test.nested_key_path = function(queue, db) {
  var schema = ydn.db.test.get_nested_key_path_schema();
  var store_name = schema.stores[0].name;

  var key = 'k' + Math.random();
  var data = {value: Math.random()};
  data.id = {$t: key};

  queue.call('put ' + key, function(callbacks) {
    db.put(store_name, data).addBoth(callbacks.add(function(value) {
      assertEquals('put OK', key, value);
    }))
  });

  queue.call('get ' + key, function(callbacks) {
    db.get(store_name, key).addBoth(callbacks.add(function(value) {
      assertEquals('get OK', data, value);
    }))
  });
};
