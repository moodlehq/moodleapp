
ydn.debug.log('ydn.db', 500);

//
//
//asyncTest("Get index", function () {
//  expect(4);
//
//  var db = new ydn.db.Storage(db_name_put, schema_index);
//  console.log(db.getSchema());
//  var value_1 = 'test ' + Math.random();
//  var value_2 = 'test ' + Math.random();
//  db.put(store_inline, {id: 1, value: value_1, tag: 'a'});
//  db.put(store_inline, {id: 2, value: value_2, tag: 'b'});
//  db.put(store_inline, {id: 3, value: value_2, tag: 'c'});
//  var keyRange = ydn.db.KeyRange.only('a');
//  var dir = 'next';
//  var q = db.query().from(store_inline, index_name, dir, keyRange);
//  db.fetch(q).then(function (x) {
//    console.log(db.getSchema());
//    equal(1, x.length, 'result length');
//    equal('a', x[0].id, 'a value');
//    var keyRange = ydn.db.KeyRange.only('c');
//    var q = db.query().from(store_inline, index_name, dir, keyRange);
//    db.fetch(q).then(function (x) {
//      equal(1, x.length, 'result length');
//      equal('c', x[0].id, 'c value');
//      start();
//    }, function (e) {
//      ok(false, e.message);
//      start();
//    });
//  }, function (e) {
//    ok(false, e.message);
//    start();
//  });
//
//});
