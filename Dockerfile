FROM ruby:3.4-slim AS ruby

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    build-essential \
    exiftran \
    imagemagick \
    libjpeg-turbo-progs && \
    gem update --system && \
    gem install jekyll

FROM ruby AS jekyll

WORKDIR /jekyll
COPY ./jekyll/Gemfile ./jekyll/Gemfile.lock ./
RUN bundle install
EXPOSE 4000
CMD ["jserve"]
