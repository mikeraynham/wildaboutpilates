FROM ruby:slim AS ruby

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
    build-essential \
    exiftran \
    imagemagick \
    libjpeg-turbo-progs && \
    gem install jekyll bundle && \
    gem update --system && \
    gem install jekyll

FROM ruby AS jekyll

WORKDIR /jekyll
COPY ./jekyll/Gemfile .
RUN bundle install
EXPOSE 4000
WORKDIR /jekyll
CMD ["/bin/bash"]
