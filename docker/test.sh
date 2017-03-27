docker run \
    --name sca-event1 \
    -v `pwd`/config:/app/api/config \
    --rm -it soichih/sca-event
