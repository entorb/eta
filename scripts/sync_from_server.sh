#!/bin/sh

# ensure we are in the root dir
script_dir=$(cd $(dirname $0) && pwd)
cd $script_dir/..

rsync -rvhu --delete --delete-excluded --no-perms entorb@entorb.net:html/eta-v1/* src/
rsync -rvhu --delete --delete-excluded --no-perms entorb@entorb.net:html/eta-v1/.htaccess src/
