var request = require('request');
var assert = require('assert');
var http = require('http');
var bundle = require('./');

describe('bundle', function() {
    var server;
    var url;
    var b;
    beforeEach(function(done) {
        server = http.createServer(handle);
        server.listen(0, listening);

        function listening(err) {
            if (err) return done(err);

            url = 'http://localhost:' + server.address().port + '/';
            done();
        }

        function handle(req, resp) {
            b(req, resp);
        }
    });

    afterEach(function(done) {
        url = undefined;
        b = undefined;
        server.close(done);
        server = undefined;
    });

    it('should create bundle when requested', function(done) {
        b = bundle({
            compile: function(opts, cb) {
                cb(null, 'My bundle');
            }
        });

        request(url, function(err, resp, body) {
            if (err) return done(err);

            assert.equal(resp.statusCode, 200);
            assert.equal(body, 'My bundle');
            done();
        });
    });

    it('should pass opts to compile function', function(done) {
        var calledOpts;
        var opts = {
            compile: function(opts, cb) {
                calledOpts = opts;
                cb(null, 'test');
            }
        };

        b = bundle(opts);

        request(url, function(err) {
            assert.ok(!err);
            assert.strictEqual(calledOpts, opts);
            done();
        });
    });

    it('should cache bundle', function(done) {
        var called = 0;

        b = bundle({
            compile: function(opts, cb) {
                called++;
                cb(null, 'test');
            }
        });

        assert.equal(called, 0);
        request(url, first);

        function first(err, resp, body) {
            assert.ok(!err);
            assert.equal(called, 1);
            assert.equal(resp.statusCode, 200);
            assert.equal(body, 'test');

            request(url, second);
        }

        function second(err, resp, body) {
            assert.ok(!err);
            assert.equal(called, 1);
            assert.equal(resp.statusCode, 200);
            assert.equal(body, 'test');

            done()
        }
    });

    it('should gzip bundle when allowed', function(done) {
        b = bundle({
            compile: function(opts, cb) {
                cb(null, 'test');
            }
        });

        request({ url: url, gzip: true }, function(err, resp, body) {
            assert.ok(!err);
            assert.equal(resp.headers['content-encoding'], 'gzip');
            assert.equal(body, 'test');

            done();
        });
    });

    it('should recreate bundle when invalidated', function(done) {
        var called = 0;
        var invalidate;
        b = bundle({
            compile: function(opts, cb) {
                called++;
                invalidate = this.invalidate;
                cb(null, 'test ' + called);
            }
        });

        request(url, first);

        function first(err, resp, body) {
            if (err) throw err;
            assert.equal(called, 1);
            assert.equal(body, 'test 1');

            invalidate();
            request(url, second);
        }

        function second(err, resp, body) {
            if (err) throw err;
            assert.equal(called, 2);
            assert.equal(body, 'test 2');

            done();
        }
    });

    it('should set content-type when type is specified', function(done) {
        b = bundle({
            type: 'some/type',
            compile: function(opts, cb) {
                cb(null, 'test');
            }
        });

        request(url, function(err, resp) {
            if (err) throw err;
            assert.equal(resp.headers['content-type'], 'some/type');
            done();
        });
    });

    it('should respond with 500 when error occurs', function(done) {
        b = bundle({
            type: 'some/type',
            compile: function(opts, cb) {
                cb(new Error());
            }
        });

        request(url, function(err, resp, body) {
            if (err) throw err;
            assert.equal(resp.statusCode, 500);
            assert.equal(body, 'Error');
            done();
        });
    });

    it('should implement etag caching', function(done) {
        b = bundle({
            compile: function(opts, cb) {
                cb(null, 'test');
            }
        });

        request(url, first);

        function first(err, resp) {
            if (err) throw err;

            request({
                url: url,
                headers: {
                    'If-None-Match': resp.headers['etag']
                }
            }, second);
        }

        function second(err, resp) {
            if (err) throw err;

            assert.equal(resp.statusCode, 304);
            done();
        }
    });

});
