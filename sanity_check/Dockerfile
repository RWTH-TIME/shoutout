FROM alpine:3.23.3

RUN apk add --no-cache bash curl postgresql-client

COPY cleanup_jobs.sh /usr/local/bin/cleanup_jobs.sh
COPY crontab.txt /etc/crontabs/root

RUN chmod +x /usr/local/bin/cleanup_jobs.sh

CMD ["crond", "-f"]
