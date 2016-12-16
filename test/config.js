'use strict';

const fs = require('fs');
const request = require('request');
const config = require('../api/config');

//override the default config so that non-test part of the code will use the updated config

config.event = {
    amqp: {
        url: "amqp://event:event@localhost:5672/event"
    },
    
    //list of exchanges that this service supports and check_access cb
    //in check_access, you can make 3rd party api call to check for user access
    //or just check the jwt sent from the client (TODO is this really possible via websocket?)
    exchanges: {

        "wf.task": function(req, key, cb) {
            //checking access for key
            cb(null, true); 
            /*
            request.get({
                url: "/checkaccess/task/"+key,
                json: true,
                headers: {'Authorization': 'Bearer '+req.query.jwt}
            }, function(err, res, body) {
                cb(err, (body.status == "ok"));
            });
            */
        }
    }
}

config.mongodb = "mongodb://localhost/eventtest";

config.express = {
    port: 8080,
    //auth validation
    pubkey: fs.readFileSync(__dirname+'/auth.pub'),
}

config.test = {
    jwt: fs.readFileSync(__dirname+'/test.jwt'),
}

