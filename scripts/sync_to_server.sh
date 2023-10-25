#!/bin/sh

# ensure we are in the root dir
script_dir=$(cd $(dirname $0) && pwd)
cd $script_dir/..

rsync -rvhu --delete --no-perms --exclude *.test.js src/*.js entorb@entorb.net:html/eta/v1/
rsync -rvhu --delete --no-perms --exclude *.test.js src/lib/ entorb@entorb.net:html/eta/v1/lib/
rsync -rvhu --delete --no-perms src/*.html entorb@entorb.net:html/eta/v1/
rsync -rvhu --delete --no-perms src/*.css entorb@entorb.net:html/eta/v1/
rsync -rvhu --delete --no-perms src/audio/*.mp3 entorb@entorb.net:html/eta/audio/v1/
