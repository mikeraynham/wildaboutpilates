FROM ruby:slim AS ruby

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends build-essential && \
    gem install jekyll bundle && \
    gem update --system && \
    gem install jekyll

FROM ruby AS jekyll

WORKDIR /jekyll
COPY ./jekyll/Gemfile .
RUN bundle install

FROM jekyll AS dev

EXPOSE 4000
RUN useradd --create-home --shell /bin/bash jekyll
USER jekyll
WORKDIR /jekyll
CMD ["/bin/bash"]
