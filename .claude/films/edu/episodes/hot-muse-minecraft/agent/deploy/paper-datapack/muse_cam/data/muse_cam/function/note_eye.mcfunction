# the eye's block and its 6 neighbours: itself, east, west, up, down, south, north (muse_cam:note)
execute positioned ~ ~ ~ run function muse_cam:nb
execute positioned ~1 ~ ~ run function muse_cam:nb
execute positioned ~-1 ~ ~ run function muse_cam:nb
execute positioned ~ ~1 ~ run function muse_cam:nb
execute positioned ~ ~-1 ~ run function muse_cam:nb
execute positioned ~ ~ ~1 run function muse_cam:nb
execute positioned ~ ~ ~-1 run function muse_cam:nb
