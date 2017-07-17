
pm2 delete event
pm2 start api/event.js --name event --watch --ignore-watch="*.log test *.sh ui bin example docker"

pm2 delete event-handler
pm2 start bin/handle.js --name event-handler --watch --ignore-watch="*.log test *.sh ui example docker"

pm2 save
