#!/bin/bash

test $$(git config user.name) || git config user.name "Build bot (via TravisCI)"
test $$(git config user.email) || git config user.email "build-bot@travis"

# Assuming this is run from repo root
zip -jr docs/cmunit.xpi src
git add docs/cmunit.xpi
git commit -m "Build XPI Extension"
git push https://${GH_TOKEN}@github.com/cmu-student-government/cmunit.git master
