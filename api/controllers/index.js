'use strict';

//contrib
const express = require('express');
const router = express.Router();
const winston = require('winston');
const mongoose = require('mongoose');
//const jwt = require('express-jwt');
const jwt = require('jsonwebtoken');

//mine
const config = require('../config');
const server = require('../server');
const logger = new winston.Logger(config.logger.winston);
const db = require('../models');

router.use('/notification', require('./notification'));

function json(obj) {
    return JSON.stringify(obj);
}

/**
 * @apiGroup System
 * @api {get} /health Get API status
 * @apiDescription Get current API status
 *
 * @apiSuccess {String} status 'ok' or 'failed'
 */
router.get('/health', function(req, res) {
    var status = "ok";
    var message = "all working good";

    var amqp_connected = (server.amqp != null);
    if(!amqp_connected) status = "failed";
    if(mongoose.connection.readyState != 1) status = "failed";

    //do real db test
    db.Notification.findOne().exec(function(err, record) {
        if(err) {
            status = "failed";
            message = err;
        }
        res.json({ status, amqp_connected, mongoose: mongoose.connection.readyState, message });
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
 *              "ex": "wf.task",
 *              "key": "1.123455.#",
 *          }
 *      }
 *      You will receive an error event if you are not authorized
 *      
 */

router.ws('/subscribe', (ws, req) => {
    logger.debug("websocket /subscribe called");
    //logger.debug(JSON.stringify(req.headers, null, 4));
    //logger.debug(JSON.stringify(req.query, null, 4));

    if(!server.amqp) {
        ws.send(json({error: "amqp not (yet) connected"}));
        return;
    }

    //parse jwt
    jwt.verify(req.query.jwt, config.express.pubkey, (err, user)=>{
        if(err) return logger.error(err);
        logger.debug(user);
        req.user = user; //pretent it like express-jwt()

        //receive request from client
        ws.on('message', function(_msg) {
            var msg = JSON.parse(_msg); 
            if(msg.bind) {
                logger.info("bind request recieved", msg);
                var ex = msg.bind.ex;
                if(!config.event.exchanges[ex]) return logger.warn("unconfigured bind request for exchange:"+ex);

                //do access check for this bind request
                logger.debug("checking access");
                var access_check = config.event.exchanges[ex];
                access_check(req, msg.bind, function(err, ok) {
                    if(err) return logger.error(err);
                    if(!ok) {
                        logger.debug("access denied", msg.bind);
                        ws.send(json({error: "Access denided"}));
                        return;
                    }

                    //good.. proceed with creating new queue / bind
                    //TODO - explain why the options?
                    server.amqp.queue('', {exclusive: true, closeChannelOnUnsubscribe: true}, (q) => {
                        q.bind(ex, msg.bind.key); 
                        q.subscribe(function(msg, headers, dinfo, ack) {
                            logger.debug("received event!", dinfo);
                            //logger.debug(msg, headers);
                            ws.send(json({
                                headers,
                                dinfo,
                                msg,
                            }));

                        }).addCallback(function(ok) {
                            ws.on('close', function(msg) {
                                logger.info("client disconnected", q.name);
                                q.unsubscribe(ok.consumerTag);
                            });
                        });
                    });
                });
            }
        });
    });   

});

module.exports = router;
