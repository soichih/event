docker build -t soichih/sca-event ..
if [ ! $? -eq 0 ]; then
    echo "failed to build"
    exit
fi
docker tag soichih/sca-event soichih/sca-event:1.0.1
docker push soichih/sca-event #latest
docker push soichih/sca-event:1.0.1
