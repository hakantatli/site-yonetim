FROM alpine:3.20

RUN apk add --no-cache \
    postgresql16-client \
    bash \
    curl \
    gzip \
    tzdata \
    coreutils

WORKDIR /

COPY backup.sh /backup.sh
COPY restore.sh /restore.sh
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /backup.sh /restore.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
