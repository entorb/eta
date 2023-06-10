#!/bin/sh

# ensure we are in the root dir
script_dir=$(cd $(dirname $0) && pwd)
cd $script_dir/..

mkdir -p src/lib

# ECharts
ver=5.4.1
wget -q https://raw.githubusercontent.com/apache/echarts/$ver/dist/echarts.min.js -O src/lib/echarts-$ver.min.js
wget -q https://raw.githubusercontent.com/apache/echarts/$ver/dist/echarts.min.map -O src/lib/echarts-$ver.min.map

# Tabulator
ver=5.4.4

mkdir -p tmp-dl
wget -q https://github.com/olifolkerd/tabulator/archive/refs/tags/$ver.zip -O tmp-dl/tabulator-$ver.zip

cd tmp-dl
unzip -q -o tabulator-$ver.zip
cd ..

mv tmp-dl/tabulator-$ver/dist/js/tabulator.min.js src/lib/tabulator-5.4.min.js
mv tmp-dl/tabulator-$ver/dist/js/tabulator.min.js.map src/lib/tabulator.min.js.map
mv tmp-dl/tabulator-$ver/dist/css/tabulator.min.css src/lib/tabulator.min.css
mv tmp-dl/tabulator-$ver/dist/css/tabulator.min.css.map src/lib/tabulator.min.css.map

rm -r tmp-dl

# wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/js/tabulator.min.js -O src/lib/tabulator-5.4.min.js
# wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/js/tabulator.min.js.map -O src/lib/tabulator.min.js.map
# wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/css/tabulator.min.css -O src/lib/tabulator.min.css
# wget https://raw.githubusercontent.com/olifolkerd/tabulator/master/dist/css/tabulator.min.css.map -O src/lib/tabulator.min.css.map
