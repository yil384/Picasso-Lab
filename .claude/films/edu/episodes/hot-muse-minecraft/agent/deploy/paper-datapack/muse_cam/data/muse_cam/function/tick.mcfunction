# every tick, only while a camera is in the world
execute unless entity @a[tag=muse_cam] run return 0
# night vision on the camera player, again whenever it is gone (a respawn, a dimension change): never a black picture
execute as @a[tag=muse_cam] unless predicate muse_cam:night_vision run effect give @s minecraft:night_vision infinite 0 true
execute unless entity @a[tag=muse_cam_target] run return 0
function muse_cam:enclosure
# the eye: an invisible display entity the camera rides; Minecraft interpolates its teleports on the client over
# teleport_duration ticks, so a target that moves each tick becomes a smooth, damped follow
execute unless entity @e[type=minecraft:item_display,tag=muse_cam_eye] at @a[tag=muse_cam_target,limit=1] run summon minecraft:item_display ~ ~1.6 ~ {Tags:["muse_cam_eye"],teleport_duration:6}
execute if entity @a[tag=muse_cam_target,tag=muse_cam_shut] run function muse_cam:outside
execute unless entity @a[tag=muse_cam_target,tag=muse_cam_shut] run function muse_cam:shoulder
function muse_cam:view
