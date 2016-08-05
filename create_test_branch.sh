#!/bin/bash

set -e

COMMIT="$1"

TESTNAME="$2"

CODEC="$3"

cd $CODEC
git fetch --all
git checkout $COMMIT
git checkout -b t-$TESTNAME
git clean -d -x -f

cd ..
mkdir -p runs/$TESTNAME

./build_codec.sh
