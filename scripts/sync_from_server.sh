#!/bin/sh

# ensure we are in the root dir
script_dir=$(cd $(dirname $0) && pwd)
cd $script_dir/..

rsync -rvhu --delete --delete-excluded --no-perms entorb@entorb.net:html/eta/* src/
rsync -rvhu --delete --delete-excluded --no-perms entorb@entorb.net:html/eta/.htaccess src/
