FROM node:20-slim

ENV HOST=0.0.0.0
ENV PORT=17085
ENV NODE_ENV=production
ENV UPLOAD_PATH=/usr/src/app/public/uploads

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm i -f

COPY . .

RUN mkdir -p ${UPLOAD_PATH}/posts \
    && mkdir -p ${UPLOAD_PATH}/items \
    && chown -R node:node /usr/src/app

EXPOSE 17085

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

ENTRYPOINT ["sh", "/usr/local/bin/entrypoint.sh"]