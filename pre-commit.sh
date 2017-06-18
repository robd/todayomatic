#!/bin/sh
git diff --staged --diff-filter=dx --name-only HEAD | grep ".*\.js$" | xargs -I % sh -c './node_modules/.bin/prettier --single-quote --trailing-comma es5 --print-width 120 --write %; git add %'