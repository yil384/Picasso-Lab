#!/bin/sh
# Paper in the container: world and config live in /data (a bind mount), the console is the FIFO /console/console.in
# (the agent writes spreadplayers there). DIFFICULTY, SEED, DAYLIGHT=locked|cycle, MEMORY come from the compose file.
set -e
cd /data
mkdir -p plugins && cp -n /opt/paper/plugins/*.jar plugins/ 2>/dev/null || true
echo "eula=true" > eula.txt   # the operator accepted the Minecraft EULA (2026-10-06)
cat > server.properties <<P
online-mode=false
server-port=25565
level-seed=${SEED:-}
spawn-protection=0
difficulty=${DIFFICULTY:-easy}
gamemode=survival
max-players=${MAX_PLAYERS:-16}
view-distance=8
simulation-distance=6
enable-command-block=false
motd=Muse plays Minecraft
P
# every bot (and the camera, compose profile "camera") joins from the agent's one address: Paper's per-address
# connection throttle (4 s) would refuse the second of two joins within 4 s. The server is private: no throttle.
if [ -f bukkit.yml ]; then sed -i 's/^\( *connection-throttle:\).*/\1 -1/' bukkit.yml; else printf 'settings:\n  connection-throttle: -1\n' > bukkit.yml; fi
rm -f /console/console.in && mkfifo /console/console.in && chmod 666 /console/console.in
if [ "${DAYLIGHT:-locked}" = locked ]; then
  ( until grep -q 'Done (' logs/latest.log 2>/dev/null; do sleep 2; done
    printf 'gamerule doDaylightCycle false\ntime set day\n' > /console/console.in ) &
fi
exec java -Xms1G -Xmx${MEMORY:-4G} -jar /opt/paper/paper.jar --nogui <> /console/console.in
