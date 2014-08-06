var crypto = require('crypto');
var zlib = require('zlib');
var P = require('p-promise');

module.exports = bundle;

function bundle(opts) {
    var self = { invalidate: invalidate };
    var type = opts.type;
    var compile = opts.compile;
    var compilePromise = P.denodeify(runCompile);
    var value;

    return handle;

    function runCompile(cb) {
        var result = {};

        compile.call(self, opts, done);

        function done(err, r) {
            if (err) return cb(err);

            if (typeof r === 'string')
                r = new Buffer(r);

            result.uncompressed = r;

            var hash = crypto.createHash('sha1');
            hash.update(r);
            result.hash = hash.digest('hex');

            zlib.gzip(r, compressed);
        }

        function compressed(err, r) {
            if (err) return cb(err);

            result.compressed = r;
            cb(null, result);
        }
    }

    function invalidate() {
        value = undefined;
    }

    function handle(req, resp) {
        if (!value)
            value = compilePromise();

        value.then(success, failed);

        function success(result) {
            var etag = req.headers['if-none-match'];
            if (etag === result.hash) {
                resp.statusCode = 304;
                return resp.end();
            }

            if (type)
                resp.setHeader('Content-Type', type);

            var accept = req.headers['accept-encoding'] || '';
            var data;
            if (accept.indexOf('gzip') !== -1) {
                resp.setHeader('Content-Encoding', 'gzip');
                data = result.compressed;
            } else {
                data = result.uncompressed;
            }

            resp.setHeader('ETag', result.hash);
            resp.setHeader('Content-Length', data.length);
            resp.end(data);
        }

        function failed(err) {
            resp.statusCode = 500;
            resp.setHeader('Content-Type', 'text/plain');
            resp.end('Error');
        }
    }
}
