# Setup #

For using this library, include one of the ydn-db
minified js file from [download page](http://dev.yathit.com/index/downloads.html)
to your HTML page.

* [User Guide](http://dev.yathit.com/ydn-db/getting-started.html)
* [API Reference](http://dev.yathit.com/api-reference/ydn-db/storage.html)
* [Demo applications](http://dev.yathit.com/index/demos.html)
* [Release notes](https://bitbucket.org/ytkyaw/ydn-db/wiki/Release_notes)
* [Download](http://dev.yathit.com/index/downloads.html)

## Supported browsers ##

Basically this library can be used in any browser.

* Chrome 4+
* Firefox 3+
* IE 6 (userdata), IE7+ (localStorage), IE10+ desktop/mobile (indexeddb)
* Safari 3.1+ desktop/mobile (websql)
* Android browser 2.1+ (websql), 4+ (indexeddb)
* Android web client, iOS web client (websql)
* Opera 10+ (websql), Opera 15+ (indexeddb)

## Features ##

* Unified data access layer on IndexedDB, WebDatabase and WebStorage storage mechanisms.
* Support *all* features of asynchronous IndexedDB API.
* The implementation of WebSQL supports schema reflection, untyped column key,
composite index, multiEntry and IndexedDB-like aborting and implicit commit transaction.
localStorage use on-memory [AVL tree index](http://en.wikipedia.org/wiki/AVL_tree)
for key range query and its performance is in-par with database.
* Support for on-the-fly [database schema](http://dev.yathit.com/api-reference/ydn-db-schema.htm l)
generation, IndexedDB-style versioned schema migration and advance schema-centric (auto-version)
migration by reflecting on existing schema.
* Well tested closure library module including 234 unit test functions in addition to
[qunit end-to-end test](http://dev.yathit.com/index/demos.html) to validate library API specification.
* Advance transaction workflow and managed request (meaning you will never ever see InvalidStateError).
* Designed for high performance index query (only).
* Customized log message, improper usage protection and guided error message on dev distribution.
* Basic support for high level query using [SQL](http://dev.yathit.com/ydn-db/sql-query.html).
* Full text search (via ydn-db-text module).
* Client-server Synchronization (via ydn-db-sync module).
* We adopt strict javascript coding pattern for performance and robustness: no global, no eval, no error globbing, parameterized query, all public methods and constructors are strongly type, this is this, coding error throw error.

## Examples ##

### Simple usage ###

Simple usage for opening, storing and retrieving by a primary key `id1`.

    db = new ydn.db.Storage('db-name');
    db.put('store-name', {message: 'Hello world!'}, 'id1');
    db.get('store-name', 'id1').always(function(record) {
      console.log(record);
    });

### Schema definition ###

    var schema = {
      stores: [{
        name: 'people',
        indexes: [{
           keyPath: 'age'
        }, {
           keyPath: ['age', 'name']
        }]
      ]
    }
    db = new ydn.db.Storage('db-name', schema);

If database exist, it will be open and update with given schema if necessary.
In doing so, object stores and indexes will be created or deleted.

### Query ###

The following snippet show querying from `people` object store using index `age`
by key range bounded by 25. The result will be sorted by `age`.

    var q = db.from('people').where('age', '>=', 25);
    var limit = 10;
    q.list(limit).done(function(objs) {
      console.log(objs);
    });

Sorting by an index with filtering on other index.

    var q = db.from('people').where('age', '=', 25);
    q.order('name').list().done(function(objs) {
      console.log(objs);
    });

Note that, above sort query require compound index `['age', 'name']` and only
equal filter is supported.

### Transaction ###

By default, each database request are executed in separate transaction and
executed in order. The following code snippet show running all database
requests in a single transaction.

    var req = db.run(function update_prop (run_db) {
    run_db.get('player', 1).done(function(data) {
        data.health += 10;
        run_db.put('player', data).done(function(key) {
          if (data.health > 100) {
            req.abort();
          }
        });
      }
    }, ['player'], 'readwrite');
    req.then(function() {
      console.log('updated.');
    }, function(e) {
      console.log('transaction aborted');
    });

### Events ###

`ydn.db.Storage` dispatch events for connection and error. Additionally
modification of records events can be installed by defining in schema.

Data heavy query should be execute after database connection is established
by listening `ready` event.

    db.addEventListener('ready', function (event) {
      var is_updated = event.getVersion() != event.getOldVersion();
      if (is_updated) {
        console.log('database connected with new schema');
      } else if (isNaN(event.getOldVersion()))  {
        console.log('new database created');
      } else {
        console.log('existing database connected');
      }
      // heavy database operations should start from this.
    );


# Library developer guide #

If you haven't try [Closure Tools](https://developers.google.com/closure/) before,
setup can be time consuming and painful. I recommend to read
Michael Bolin book's [Closure: The Definitive Guide](http://shop.oreilly.com/product/0636920001416.do).
A good understanding of closure coding pattern is necessary to understand and
follow this library codes.

[Apache ant](http://ant.apache.org/) is used to build javascript compiler. ydn-base repo
[build.xml](https://bitbucket.org/ytkyaw/ydn-base/raw/master/build.xml) defines compiler
and others tools setting. You must change according to your local machine setting.
Specifically check property values of `closure-library.dir` and `closure-compiler.dir`, which
point to respective directries.

Downloads the following three repos a directory.

    svn checkout http://closure-library.googlecode.com/svn/trunk/
    git clone git@bitbucket.org:ytkyaw/ydn-db.git
    git clone https://bitbucket.org/ytkyaw/ydn-base.git

that should create three directories for closure-library, ydn-base and ydn-db.

Run local apache (recommended) or a static server on that directory.

Go to ydn-db folder and run `ant deps` and `ant ydn-base.deps` to generate closure dependency tree.

Use HTML files in the /test folder for getting started. These files are also
used for debug development.

Note: we use master track version of closure tools. Compiling with pre-build jar
may encounter compile error.

Note: precompile files are built by using custom compiler to strip debug messages.
See detail on ydn-base/tools/strip_debug.txt.

Additional features requires the following optional repos.

1. Full text search https://github.com/yathit/ydn-db-fulltext.git
2. Dependency for ydn-db-fulltext https://github.com/yathit/fullproof
3. Dependency for ydn-db-fulltext https://github.com/yathit/natural
4. Synchronization https://bitbucket.org/ytkyaw/ydn-db-sync (private)


## Testing ##

You should able to run /ydn-db/test/all-test.html or run individually.
Since all test are async, disable run inparallel check box.
These test files are for basic testing and debugging.

Coverage test is performed by [JsTestDriver](http://code.google.com/p/js-test-driver/)
test. Notice that `ant gen-alltest-js` generate jsTestDriver.conf to prepare testing
configuration.

    java -jar JsTestDriver.jar --tests all

End-to-end testing for disteribution can be found in test/qunit folder as well
 as online [qunit test kits] (http://dev.yathit.com/index/demos.html).


## Contributing ##

Sending pull request is easiest way. For more, email to one of the authors in
the source code.

We follow [Google JavaScript Style Guide](http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml).
All commit on master branch must pass most stringent setting compilation and all unit tests.

Few coding dialect we have as follow:

* Preferred variable naming is `like_this` `notLikeThis`. For function name, `useLikeThis` as usual.
* Assume native types (boolean, number, string) are not nullable. If nullable type is used,
it is different from `undefined`. Using `undefined` for missing value in native type
is encourage over `null`.


## Library design ##

* Library API should be similar to IndexedDB API and use exact
terminology and concept in the IndexedDB specification. So that, people
 who already familiar with it can pick up immediately as well as go forward
 with native API.
* Simple operations should be easy to use as well as optimized for it.
Also impose user to use efficient
methods while making inefficient ways very difficult or impossible.
* For complex query, helper utility functions and classes will be provided.
Storage class has deep understanding about these helper classes and do
optimization behind the sense.
* Memory efficient and must not use buffer memory. If buffer is used, it must
 be explicit. Memory leak is unacceptable.
* Provide extensive error and log message in debug mode, spare no expense since
 we will strip them in production binary. Error and exception should be
thrown as soon as possible, preferable before async callback.
* Since this API is very simple, fallback to WebSQL and WebStorage should
be straight forward. This library design have no consideration for these
storage mechanisms.


## Bug report ##

Please [file an issue](https://bitbucket.org/ytkyaw/ydn-db/issues/new) for bug
report describing how we could reproduce the problem. Any subtle problem,
memory/speed performance issue and missing feature from stand point of IndexedDB
API will be considered.

You may also ask question in [Stackoverflow #ydn-db](http://stackoverflow.com/questions/tagged/ydn-db)
with ydb-db hash, or follow on Twitter [@yathit](https://twitter.com/yathit).


## License ##
Licensed under the Apache License, Version 2.0