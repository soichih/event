
SCA event service allows you to subscribe to AMQP messages through HTML5 Websocket. It relays user's JWT to event source to make sure that user has access to events published.

For example, SCA Workflow service publishes task events to AMQP. 

```json
{"_id":"57c4a6fafe948ddd0372e20e","status_msg":"","request_date":"2016-08-30T19:52:46.992Z","status":"requested","progress_key":"_sca.57912b0fef01633d720918cf.57c4a6fafe948ddd0372e20e","user_id":"1","config":{"source_dir":"57c4a6fafe948ddd0372e20d/download"},"instance_id":"57912b0fef01633d720918cf","service":"soichih/sca-product-nifti","name":"diff import","__v":4,"_envs":{"SCA_WORKFLOW_ID":"57912b0fef01633d720918cf","SCA_WORKFLOW_DIR":"/N/dc2/scratch/hayashis/sca/s7-workflows/57912b0fef01633d720918cf","SCA_TASK_ID":"57c4a6fafe948ddd0372e20e","SCA_TASK_DIR":"/N/dc2/scratch/hayashis/sca/s7-workflows/57912b0fef01633d720918cf/57c4a6fafe948ddd0372e20e","SCA_SERVICE":"soichih/sca-product-nifti","SCA_SERVICE_DIR":"$HOME/.sca/services/soichih/sca-product-nifti","SCA_PROGRESS_URL":"https://soichi7.ppa.iu.edu/api/progress/status/_sca.57912b0fef01633d720918cf.57c4a6fafe948ddd0372e20e","test":"hello"},"resource_id":"575ee815b62439c67b693b85","create_date":"2016-08-29T21:19:54.592Z","resource_ids":["575ee815b62439c67b693b85"],"resource_deps":[],"deps":["57c4a6fafe948ddd0372e20d"]}
```

## Client/UI Side Things

On the Web UI, you can start receiving messages by connecting to this service via WebSocket.


```javascript
var jwt = localStorage.getItem("jwt");
var eventws = new ReconnectingWebSocket("wss:https://test.sca.iu.edu/api/event/subscribe?jwt="+jwt);
eventws.onopen = function(e) {
    console.log("eventws connection opened.. now binding to task message");
    eventws.send(JSON.stringify({
        bind: {
            ex: "wf", key: "task."+_instance._id+".#",
        }
    }));
}
eventws.onmessage = function(e) {
    var data = JSON.parse(e.data);
    var task = data.msg;
    console.log([task._id, task.status, task.status_msg, task.next_date]);
}
```

* I am using [ReconnectingWebSocket](https://github.com/joewalnes/reconnecting-websocket) instead of the plain WebSocket to automate reconnection.

## Server Side Things

SCA service relays user's JWT to configured access check API of the event source. For example "wf" exchange maybe configured with following.

```javascript
exports.event = {
    ...

    exchanges: {
        wf: function(req, key, cb) {
            request.get({
                url: sca_host+"/api/wf/event/checkaccess/"+key,
                json: true,
                headers: {'Authorization': 'Bearer '+req.query.jwt}
            }, function(err, res, body) {
                cb(err, (body.status == "ok"));
            });
        }
    }
    
}
```

Above configuration tells SCA event service that, it should accept request for "wf" exchange binding, and for such bind request check user's access for the exchange and specified key using Workflow service's /event/checkaccess/:key API. The URL of API and format of key are specific to each event source services. Please read the documentation for each services.

## API DOC

Please see [API Doc](https://test.sca.iu.edu/event/apidoc/) for more info.


