FROM node:10

MAINTAINER Soichi Hayashi <hayashis@iu.edu>

RUN apt update && apt install -y vim

#legacy ui
RUN npm install http-server -g
EXPOSE 80

COPY . /app
RUN cd /app && npm install --production 
EXPOSE 8080

#CMD [ "/app/docker/start.sh" ]
