#!/bin/bash

WEB_DIR=$(pwd)
echo Applying security rules in: ${WEB_DIR}


#find ./site-data/galleries -type d -exec chown nobody:users {} \;
find ./site-data/galleries -type d -exec chmod u=rwx,g=rwx,o=rx {} \;

#find ./site-data/galleries -type f -exec chown nobody:users {} \;
find ./site-data/galleries -type f -exec chmod u=rw,g=rw,o=r {} \;


find . -xdev -type d -path ./site-data/galleries -prune -o -type d -exec chown root:http {} \;
find . -xdev -type d -path ./site-data/galleries -prune -o -type d -exec chmod u=rwx,g=rwx,o=rx {} \;

find . -xdev -type f -exec chown root:http {} \;
find . -xdev -type f -exec chmod u=rw,g=rw,o=r {} \;

chmod u=rwx,g=r,o= $0
