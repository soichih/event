'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const winston = require('winston');
const expressWinston = require('express-winston');
const compression = require('compression');
const cors = require('cors');
const amqp = require('amqp');
const request = require('request');
const nodemailer = require('nodemailer');
const async = require('async');

//mine
const config = require('../api/config');
const logger = new winston.Logger(config.logger.winston);
const db = require('../api/models');

var amqp_conn = amqp.createConnection(config.event.amqp, {reconnectBackoffTime: 1000*10});
var amqp_ready = false;
var task_q = null;

var mail_transporter = nodemailer.createTransport();
logger.debug("debug");

db.init(function(err) {
    if(err) return cb(err);
    logger.info("db connected");
    amqp_conn.on('ready', function() {
        amqp_ready = true;
        logger.info("amqp connection ready");
        
        //create queue to listen to events
        amqp_conn.queue('', {exclusive: true}, (q) => {
            q.subscribe(function(msg, headers, dinfo, msgobj) {
                if(msg.status == "finished") {
                    task_finished(msg, function(err) {
                        if(err) logger.error(err); //continue
                        logger.debug("finished task handled "+msg._id);
                    });
                }
            });
            //bind to all..
            q.bind("wf.task", "#");
            task_q = q;
        });
    });
    amqp_conn.on('error', function(err) {
        amqp_ready = false;
        logger.error("amqp connection error");
        logger.error(err);
    });
});


function task_finished(task, cb) {
    //query for notification waiting for this task complete
    db.Notification.find({
        event: "wf.task.finished", 
        user_id: task.user_id,
        trigger_date: { $exists: false },
        "config.task_id": task._id,
    })
    .exec(function(err, notifications) {
        if(err) return cb(err);
        async.eachSeries(notifications, function(notification, next) {
            notification.trigger_date = new Date();
            notification.save(function(err) {
                if(err) return next(err); //bad..
                handle_task(notification, task, next);
            });
        }, cb);
        
    });    
}

function handle_task(notification, task, cb) {

    logger.info("handling task");
    logger.debug(JSON.stringify(notification, null, 4));
    logger.debug(task);

    switch(notification.handler) {
    case "email": 
        handle_task_email(notification.config, task, cb); break;
    default:
        return cb("unknown notification handler:"+notification.handler);
    }
}

function handle_task_email(_config, task, cb) {
    //lookup submitter's auth profile
    request.get({
        url: config.sca.auth_api+"/user/"+task.user_id,
        json: true,
        headers: { 'Authorization': 'Bearer '+config.sca.jwt }
    }, function(err, res, profile) {
        logger.debug("sending email to "+profile.email);
        mail_transporter.sendMail({
            from: config.handler.email.from,
            to: profile.email,
            subject: _config.subject,
            text: _config.message,
        }, function(err, info) {
            if(err) return cb(err);
            if(info && info.response) logger.info("notification email sent "+info.response);
            cb();
        });
    });
}
