#!/bin/bash
# usage: my/run.sh <snippet> <prefix> <times> <exits> <phone>
cd /tmp/picasso-tools
rm -f shots/$2_*.jpg
DSF=${DSF:-2} NODE_PATH=/opt/node22/lib/node_modules timeout 300 node pfx_test.js "$1" "$2" "$3" "$4" "$5" && python3 pgrid.py shots/g_$2.jpg $2
