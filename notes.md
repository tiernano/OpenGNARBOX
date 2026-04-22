GNARBOX 2.0 SSD: Reverse Engineering Findings

Project Status: Firmware extracted, mounted, and initial OS architecture identified.
Environment: Parrot OS (ARM64 via UTM on Apple Silicon M2).

1. Hardware Profile (Inferred)

Compute: 2.4 GHz Intel Quad-Core CPU (x86_64 architecture). Note: Even though you are analyzing it on an ARM64 Mac, the GNARBOX hardware is x86_64.

Memory: 4GB RAM.

Storage: 1TB internal NVMe SSD + SD Card Reader.

Connectivity: Wi-Fi (HostAP mode for the app), USB-C.

2. Firmware Structure (.wic format)

The gbxos-install-image.wic file is an OpenEmbedded Image Creator (WIC) file. This is standard output for embedded Linux distributions built with the Yocto Project.

Nature: A .wic file is essentially a raw disk image containing a partition table (usually GPT or MBR) and multiple formatted partitions (e.g., a FAT32 /boot partition and an ext4 /rootfs partition).

Implication: Because it's standard Yocto, the OS is highly modular but stripped down. It uses systemd or SysVinit for startup and relies on standard Linux networking paradigms.

3. Software Architecture (The "Docker Setup")

The most critical finding is the reliance on Docker.
The GNARBOX engineers built a minimal Linux host OS whose primary job is just to run the Docker daemon. The actual "features" of the GNARBOX (the API, the file transfer engine, the video transcoder, the database) are isolated inside Docker containers.

What this means for us:

API Isolation: There is likely an Nginx or custom web server container handling HTTP requests from the old app.

Microservices: We will likely find separate containers for different tasks (e.g., gbx-api, gbx-transcode, gbx-storage).

Ease of Modification: We don't have to decompile massive C++ binaries. We can simply look at the docker-compose.yml (or systemd unit files starting the containers) to see how things are wired together. We can disable their proprietary containers and spin up our own simple Alpine Linux or Node.js containers to handle file transfers.

4. The Attack Vector (SD Card Update)

Based on historical changelogs (v2.6.3+), the device supports offline flashing via the SD card.

By modifying the mounted .wic filesystem, repacking it, and using the official update mechanism, we can flash a modified root filesystem to the device without ever opening the chassis.


5. based on details above, TiernanO has used the latest firmware (ask and i can send it on) and ran some tools like binwalk and file on it. Binwalk gives a load of files, some small, some larger. Some of the larger files are disk images, some are gziped. After un-gzipping then and running though file, i found the file named 225C000. That seems to have a linux file system in it with some interesting things.

docker is installed, but under /etc/docker/daemon.json it has a runetime of rundmc... Cant seem to find anything about that online... Could be custom?
