




(function () {

  var db_name = 'test-text-1';
  var schema = {
    stores: [
      {
        name: 'st1',
        autoIncrement: true
      }
    ],
    fullTextCatalogs: [{
      name: 'people',
      sources: [
        {
          storeName: 'st1',
          keyPath: 'name'
        }]
    }]
  };
  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  var data = [{
    name: 'John smit'
  }, {
    name: 'Al david'
  }, {
    name: 'Curtor John'
  }];
  var df = $.Deferred();
  db.put('st1', data).done(function(value) {
    df.resolve();
  });
  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 3) {
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      }
    }
  };

  reporter.createTestSuite('text');
  module("text,simple", test_env);

  asyncTest("basic", 7, function () {
    df.always(function() {
      db.search('people', 'smit').always(function(x) {
        // console.log(x);
        equal(x.length, 1, 'only one result');
        var m = x[0];
        ok(!!x, 'has result');
        equal(m.storeName, 'st1', 'store name');
        equal(m.value, 'smit', 'value');
        var tokens = m.tokens;
        equal(tokens.length, 1, '# tokens');
        var token = tokens[0];
        equal(token.keyPath, 'name', 'index name');
        equal(token.value, 'smit', 'index value');
        start();
      });
    });
  });

  asyncTest("invalid search", 1, function () {
    df.always(function() {
      db.search('people', 'book').always(function(x) {
        // console.log(x);
        equal(x.length, 0, 'no result');
        start();
      });
    });
  });


  asyncTest("multiple result", 1, function () {
    df.always(function() {
      db.search('people', 'john').always(function(x) {
        // console.log(x);
        equal(x.length, 2, 'no result');
        start();
      });
    });
  });

})();




(function () {

  var db_name = 'test-text-2';
  var schema = {
    stores: [
      {
        name: 'st1',
        autoIncrement: true
      }
    ],
    fullTextCatalogs: [{
      name: 'people',
      lang: 'en',
      sources: [
        {
          storeName: 'st1',
          keyPath: 'name'
        }]
    }]
  };
  var db = new ydn.db.Storage(db_name, schema, options);
  db.clear();
  var data = [{
    name: 'John smit'
  }, {
    name: 'Al david'
  }, {
    name: 'Curtor John'
  }];
  var p_keys;
  db.put('st1', data).done(function(value) {
    p_keys = value;
  });

  var total = 0;
  var test_env = {
    setup: function () {

    },
    teardown: function () {
      total++;
      if (total == 1) {
        ydn.db.deleteDatabase(db.getName(), db.getType());
        db.close();
      }
    }
  };

  reporter.createTestSuite('text');
  module("text,phonetic-en", test_env);

  asyncTest("basic", 7, function () {

    db.search('people', 'jon').always(function(x) {
      // console.log(x);
      equal(x.length, 2, 'only one result');
      deepEqual([x[0].primaryKey, x[1].primaryKey], [p_keys[0], p_keys[2]], 'primary key');
      var m = x[0];
      equal(m.storeName, 'st1', 'store name');
      equal(m.value, 'John', 'value');
      var tokens = m.tokens;
      equal(tokens.length, 1, '# tokens');
      var token = tokens[0];
      equal(token.keyPath, 'name', 'index name');
      equal(token.value, 'John', 'index value');
      start();
    });
  });


})();




