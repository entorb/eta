#!/bin/sh

# ensure we are in the root dir
script_dir=$(cd $(dirname $0) && pwd)
cd $script_dir/..

mkdir -p src/lib

wget https://raw.githubusercontent.com/apache/echarts/5.4.1/dist/echarts.min.js -O src/lib/echarts-5.4.1.min.js

wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/js/tabulator.min.js -O src/lib/tabulator-5.4.min.js
wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/js/tabulator.min.js.map -O src/lib/tabulator.min.js.map
wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/css/tabulator.min.css -O src/lib/tabulator.min.css
wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/css/tabulator.min.css.map -O src/lib/tabulator.min.css.map
