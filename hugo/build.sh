#!/usr/bin/env bash
set -euo pipefail

HUGO_VERSION=0.164.0
DART_SASS_VERSION=1.101.0

main_dir=$(pwd)
build_dir=$(mktemp -d)

curl -sfL -o "${build_dir}/hugo.tar.gz" \
  "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_linux-amd64.tar.gz"
tar -xf "${build_dir}/hugo.tar.gz" -C "${build_dir}"

curl -sfL -o "${build_dir}/dart-sass.tar.gz" \
  "https://github.com/sass/dart-sass/releases/download/${DART_SASS_VERSION}/dart-sass-${DART_SASS_VERSION}-linux-x64.tar.gz"
tar -xf "${build_dir}/dart-sass.tar.gz" -C "${build_dir}"

export PATH="${build_dir}:${build_dir}/dart-sass:${PATH}"

cd "${main_dir}"
hugo --gc
