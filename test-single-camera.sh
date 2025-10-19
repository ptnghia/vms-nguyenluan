#!/bin/bash
# Test recorder với 1 camera only - safe testing

echo "=== VMS Recorder - Single Camera Test ==="
echo "Testing with: Agri Luong Son 1 (verified working)"
echo "Press Ctrl+C to stop"
echo ""

# Clean test directory
rm -rf /tmp/vms-test-single
mkdir -p /tmp/vms-test-single
chmod 777 /tmp/vms-test-single

# Run recorder
cd /home/camera/app/vms/services/recorder/build

DATABASE_HOST=localhost \
DATABASE_PORT=5432 \
DATABASE_NAME=vms \
DATABASE_USER=vms_user \
POSTGRES_PASSWORD=l3Gd63G2iBlqtiWI \
REDIS_HOST=localhost \
REDIS_PORT=6379 \
RECORDING_PATH=/tmp/vms-test-single \
./vms-recorder
