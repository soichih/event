
SCA event service allows you to subscribe to AMQP messages via Websocket. It uses JWT to only allow users to subscribe to authorized exchange / routing keys.

For example, SCA Workflow service publishes task events to AMQP. Users of workflow service can request an authorization JWT from /wf/instance API.

```javascript
$http.get("https://sca.iu.edu/api/wf/instance/eventtoken/"+_instance._id)
.then(function(res) {
    var jwt = res.data;
});
```

Now, returned jwt(decoded) contains `exchange`, and `keys` attributes like following.

```json
{
  "sub": 1,
  "exp": 1472551599.352,
  "exchange": "wf",
  "keys": [
    "task.57912b0fef01633d720918cf.#"
  ],
  "iat": 1472508399
}
```

This token tells SCA event service that the user is authorized to subscribe to `wf` exchange and exchange keys listed under `keys`.

In order for SCA event service to be able to validate this token, you will need to configure the SCA event service API to map the `wf` exchange with a public key used
to sign the token on the SCA Workflow service.

```javascript
exports.event = {
    ...
    
    //list of exchanges that this service supports (and jwt token to trust)
    exchanges: {
        wf: fs.readFileSync('/home/hayashis/git/sca-wf/config/wf.pub'),
    }
}
```

Now, user can subscribe to authorized exchange/keys from their browser (or client that supports Websocket)

```javascript
var eventws = new ReconnectingWebSocket("wss:"+window.location.hostname+appconf.event_api+"/wf?jwt="+jwt);
eventws.onopen = function(e) {
    console.log("eventws connection opened");
}
eventws.onmessage = function(e) {
    //dump message..
    var task = JSON.parse(e.data);
    console.log([task._id, task.status, task.status_msg, task.next_date]);
}
eventws.onclose = function(e) {
    console.log("eventws connection closed - should reconnect");
}

```

* I am using [ReconnectingWebSocket](https://github.com/joewalnes/reconnecting-websocket) instead of the plain WebSocket to automate reconnection.

## API DOC

Please see [API Doc](https://test.sca.iu.edu/event/apidoc/)


