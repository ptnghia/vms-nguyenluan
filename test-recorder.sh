#!/bin/bash
# Test recorder script

export POSTGRES_PASSWORD="l3Gd63G2iBlqtiWI"
export DATABASE_HOST="localhost"
export DATABASE_PORT="5432"
export DATABASE_NAME="vms"
export DATABASE_USER="vms_user"
export RECORDING_PATH="/home/camera/app/vms/data/recordings"

cd /home/camera/app/vms/services/recorder/build

echo "Starting recorder at $(date)"
./vms-recorder 2>&1 | tee -a /tmp/recorder-output.log
