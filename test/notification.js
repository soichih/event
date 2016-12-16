'use strict';

//contrib
const request = require('supertest')
const assert = require('assert');
const fs = require('fs');

//mine
const config = require('../api/config');
require(__dirname+"/config"); //override
const db = require('../api/models');
const app = require('../api/server').app;

//config override

//config.sca.jwt is admin token.. if I want to test as normal user, I need to use userjwt
//const testjwt = fs.readFileSync(__dirname+'/config/test.jwt');

describe('/notification', function() {
    it('should create a new notification', function(done) {
        request(app)
        .post('/notification')
        .send({
            event: "wf.task.finished",
            handler: "email",
            config: {
                message: "hello please visit https://somewhere.com/123"
            }
        })
        .set('Authorization', 'Bearer '+config.test.jwt)
        .set('Accept', 'application/json')
        .expect(200)
        .end(function(err, res) {
            if(err) return done(err);
            var notification = res.body;
            assert(notification.user_id == "test"); //should be set to correct user_id
            done();
        });
    });
});
