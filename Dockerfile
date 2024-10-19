FROM ruby:slim AS jekyll

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends build-essential && \
    gem install jekyll bundler

WORKDIR /site

RUN gem update --system && gem install jekyll
COPY ./bin/docker-entrypoint.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

FROM jekyll AS jekyll-serve

WORKDIR /site
EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0"]
