# http-bundle

[![Build Status](http://img.shields.io/travis/conradz/http-bundle.svg)](https://travis-ci.org/conradz/http-bundle)
[![NPM](http://img.shields.io/npm/v/http-bundle.svg)](https://npmjs.org/packages/http-bundle)

Generic node.js HTTP handler for generated bundles

This is great for serving browserify bundles, generated css, or any other
content that is generated infrequently. It automatically gzips the result and
implements ETag caching.

## example

```js
var bundle = require('http-bundle');
var http = require('http');

var b = bundle({
    compile: compile,
    type: 'text/css'
});

var server = http.createServer(b);
server.listen(8000);

function compile(cb) {
    // usually a more elaborate compilation process
    cb(null, '.css { content: "some css"; }');
}
```

## api

```
http-bundle(opts)
```

Returns an HTTP handler function that serves the bundle when requested. The
returned function can be used as Express/Connect middleware or as a normal HTTP
server handler function.

The `compile` function is required to be specified in the `opts` object. It
will be called as `compile(opts, callback)` to generate the bundle the first
time it is requested. The `opts` object is the same as the `opts` passed to the
`http-bundle` function.

Inside the `compile` function you can call `this.invalidate()` to force the
bundle to be recompiled the next time it is requested. Usually you want to save
this function and call it later (for example from a file watcher).

### options

 * `compile`: The function that will be called when the bundle is first
   requested. It must call the callback with an optional error and the result.
 * `type`: (optional) A string specifying the `Content-Type` to set on the
   result.
