
pm2 delete sca-event
pm2 start api/event.js --name sca-event --watch --ignore-watch="*.log test *.sh ui bin example"
pm2 save
