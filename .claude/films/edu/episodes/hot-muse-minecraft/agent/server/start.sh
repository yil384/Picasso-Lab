#!/bin/zsh
# Headless Paper 1.21.4 for the Muse bot: offline, localhost only, fixed seed. RESET=1 deletes the world first.
cd "$(dirname "$0")"
[ "${RESET:-0}" = 1 ] && rm -rf world world_nether world_the_end
echo "eula=true" > eula.txt   # the user accepted the Minecraft EULA on 2026-10-06
cat > server.properties <<P
online-mode=false
server-ip=127.0.0.1
server-port=25565
level-seed=${SEED:-forestbot}
spawn-protection=0
difficulty=${DIFFICULTY:-peaceful}
gamemode=survival
max-players=8
view-distance=8
simulation-distance=6
enable-command-block=false
motd=Muse plays Minecraft (local)
P
# console commands: echo "op NAME" > console.in (a FIFO opened read-write, so the server never sees end of input)
rm -f console.in && mkfifo console.in
exec ./jdk/Contents/Home/bin/java -Xms1G -Xmx3G -jar paper.jar --nogui <> console.in
