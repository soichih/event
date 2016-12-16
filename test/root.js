'use strict';

//contrib
const request = require('supertest')
const assert = require('assert');
const fs = require('fs');

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
        .expect(200, done);
    });
});

