define({ "api": [
  {
    "group": "Event",
    "type": "get",
    "url": "/health",
    "title": "Get API status",
    "description": "<p>Get current API status</p>",
    "name": "GetHealth",
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "status",
            "description": "<p>'ok' or 'failed'</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "api/controllers.js",
    "groupTitle": "Event"
  },
  {
    "group": "Event",
    "type": "ws",
    "url": "/echo",
    "title": "Echo",
    "description": "<p>('messasge') Echo back message sent</p>",
    "name": "WSEcho",
    "version": "0.0.0",
    "filename": "api/controllers.js",
    "groupTitle": "Event"
  }
] });