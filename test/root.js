'use strict';

//contrib
const request = require('supertest')
const assert = require('assert');
const fs = require('fs');
const amqp = require('amqp');

//mine
const config = require("../api/config");
require(__dirname+"/config"); //override
const db = require('../api/models');
const app = require('../api/server').app;

before(function(done) {
    console.log("connecting to mongodb");
    this.timeout(10000);
    db.init(function(err) {
        if(err) return done(err);
        done();
    });
});

describe('GET /health', function() {
    it('return 200', function(done) {
        request(app)
        .get('/health')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
            if (err) throw err;
            console.dir(res.body);
            assert(res.body.mongoose == 1, "mongoose status is not ok");
            done();
        });
    });
});

