'use strict';

//contrib
const express = require('express');
const router = express.Router();
const winston = require('winston');
const mongoose = require('mongoose');

//mine
const config = require('../config');
const server = require('../server');
const logger = new winston.Logger(config.logger.winston);
const db = require('../models');

router.use('/notification', require('./notification'));

/**
 * @apiGroup System
 * @api {get} /health Get API status
 * @apiDescription Get current API status
 *
 * @apiSuccess {String} status 'ok' or 'failed'
 */
router.get('/health', function(req, res) {
    var ret = {
        status: "ok",
        amqp_connection: server.amqp?true:false, 
        mongoose: mongoose.connection.readyState
    }
    if(mongoose.connection.readyState != 1) ret.status = "failed";
    if(!server.amqp) ret.status = "failed";

    //do real db test
    db.Notification.findOne().exec(function(err, record) {
        if(err) {
            ret.status = "failed";
            ret.message = err;
        }
        /* - not necessary?
        if(!record) {
            ret.status = "failed";
            ret.message = "no instance from db";
        }
        */
        if(ret.status != "ok") logger.debug(ret);
        res.json(ret);
    });
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
    logger.debug("websocket /subscribe called");
    logger.debug(JSON.stringify(req.headers, null, 4));
    logger.debug(JSON.stringify(req.query, null, 4));

    var q = null;

    if(!server.amqp) {
        ws.send(JSON.stringify({error: "amqp not connected"}));
        return;
    }

    function bind(msg) {
        if(!q) {
            logger.debug("queue not ready.. postponing bind");
            setTimeout(function() {
                bind(msg);
            }, 1000)
            return;
        }

        //TODO - should I handle keys as well as just key?
        var ex = msg.bind.ex;
        var key = msg.bind.key;
        if(!config.event.exchanges[ex]) return logger.warn("unconfigured bind request for exchange:"+ex);
        var access_check = config.event.exchanges[ex];
        access_check(req, key, function(err, ok) {
            if(err) return logger.error(err);
            if(ok) {
                //bind if client is still connected (sometimes they disappear)
                if(q) q.bind(ex, key); 
            } else {
                logger.debug("access denied", ex, key, req.query);
                ws.send(JSON.stringify({error: "Access denided for ex:"+ex+" key:"+key}));
            }
        });
    }

    ws.on('message', function(json) {
        var msg = JSON.parse(json); 
        if(msg.bind) {
            logger.info("bind request recieved", msg);
            bind(msg);
        }
    });

    //create exclusive queue and subscribe
    logger.info("creating new queue");
    server.amqp.queue('', {exclusive: true, closeChannelOnUnsubscribe: true}, (_q) => {
        q = _q;

        logger.info("created new queue", q.name);
        q.subscribe(function(msg, headers, dinfo, msgobj) {
            logger.info("subscribed to queue - replying", q.name);
            ws.send(JSON.stringify({
                headers: headers,
                dinfo: dinfo,
                msg: msg
            }), function(err) {
                if(err) logger.error(err);
            });
        }).addCallback(function(ok) {
            ws.on('close', function(msg) {
                logger.info("client disconnected", q.name);
                //q.destroy();
                q.unsubscribe(ok.consumerTag);
            });
        });
    });

});

module.exports = router;
