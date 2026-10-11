# every tick, only while a camera is in the world
execute unless entity @a[tag=muse_cam] run return 0
# night vision on the camera player, again whenever it is gone (a respawn, a dimension change): never a black picture
execute as @a[tag=muse_cam] unless predicate muse_cam:night_vision run effect give @s minecraft:night_vision infinite 0 true
execute unless entity @a[tag=muse_cam_target] run return 0
function muse_cam:enclosure
# a portal, a respawn far away: the camera player is not near the bot (only the bot's own dimension is searched)
scoreboard players remove #cd muse_cam_cd 1
execute if score #cd muse_cam_cd matches ..-100 run scoreboard players set #cd muse_cam_cd 0
execute if score #cd muse_cam_cd matches ..0 at @a[tag=muse_cam_target,limit=1] unless entity @a[tag=muse_cam,distance=..48] run function muse_cam:regroup
# the eye: an invisible display entity the camera rides; Minecraft interpolates its teleports on the client over
# teleport_duration ticks (3), and its yaw follows the bot's damped (muse_cam:yaw), so the follow is smooth
execute unless entity @e[type=minecraft:item_display,tag=muse_cam_eye] at @a[tag=muse_cam_target,limit=1] run function muse_cam:new_eye
function muse_cam:yaw
execute if entity @a[tag=muse_cam_target,tag=muse_cam_shut] run function muse_cam:outside
execute unless entity @a[tag=muse_cam_target,tag=muse_cam_shut] run function muse_cam:shoulder
function muse_cam:view
