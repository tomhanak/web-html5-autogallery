#!/bin/bash

WEB_DIR=$(pwd)
echo Applying security rules in: ${WEB_DIR}

chown -R root:http .
#find . -type d -exec chmod u=rwx,g=rx,o= {} \;
#find . -type f -exec chmod u=rw,g=r,o= {} \;
find . -type d -exec chmod u=rwx,g=rwx,o= {} \;
find . -type f -exec chmod u=rw,g=rw,o= {} \;
#chmod u=rwx,g=,o= $0
