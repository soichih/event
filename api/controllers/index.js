'use strict';

//contrib
const express = require('express');
const router = express.Router();
//const jwt = require('express-jwt');
//const jsonwebtoken = require('jsonwebtoken');
const winston = require('winston');
const mongoose = require('mongoose');

//mine
const config = require('../config');
const server = require('../server');
const logger = new winston.Logger(config.logger.winston);

router.use('/notification', require('./notification'));

/**
 * @apiGroup System
 * @api {get} /health Get API status
 * @apiDescription Get current API status
 *
 * @apiSuccess {String} status 'ok' or 'failed'
 */
router.get('/health', function(req, res) {
    var status = "ok";
    if(mongoose.connection.readyState != 1) status = "failed";
    if(!server.amqp) status = "failed";
    res.json({status: status, amqp_connection: server.amqp?true:false, mongoose: mongoose.connection.readyState});
});

/**
 * @apiGroup Event
 * @api {get} /subscribe Subscribe
 * @apiParam {String} jwt JWT token to be relayed to event source. Should be a JWT token issued by SCA Auth service.
 * @apiDescription 
 *      Subscribe to AMQP. Once connected, you need to emit bind messages to bind to specific exchange:key.
 *      {
 *          "bind": { 
 *              "ex": "wf",
 *              "key": "task.123455.#",
 *          }
 *      }
 *      You will receive an error event if you are not authorized
 *      
 */
router.ws('/subscribe', (ws, req) => {

    if(!server.amqp) {
        ws.send(JSON.stringify({error: "amqp not connected"}));
        return;
    }

    //create exclusive queue and subscribe
    var _q = null;
    server.amqp.queue('', {exclusive: true}, (q) => {
        _q = q;
        q.subscribe(function(msg, headers, dinfo, msgobj) {
            ws.send(JSON.stringify({
                headers: headers,
                dinfo: dinfo,
                msg: msg
            }), function(err) {
                if(err) logger.error(err);
            });
        });
    });

    ws.on('close', function(msg) {
        logger.info("client disconnected");
        _q.destroy();
        _q = null;
    });

    ws.on('message', function(json) {
        var msg = JSON.parse(json); 
        if(msg.bind) bind(msg);
    });

    function bind(msg) {
        //logger.debug("bind request received");
        //logger.debug(msg);

        //TODO - should I handle keys as well as just key?
        var ex = msg.bind.ex;
        var key = msg.bind.key;
        if(!config.event.exchanges[ex]) return logger.warn("unconfigured bind request for exchange:"+ex);
        var access_check = config.event.exchanges[ex];
        access_check(req, key, function(err, ok) {
            if(err) return logger.error(err);
            if(ok) {
                //bind if client is still connected (sometimes they disappear)
                if(_q) _q.bind(ex, key); 
            } else {
                logger.debug("access denied");
                logger.debug(err);
                ws.send(JSON.stringify({error: "Access failed for ex:"+ex+" key:"+key}));
            }
        });
    }
});


module.exports = router;
