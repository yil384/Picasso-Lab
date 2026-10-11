# the camera is not near the bot any more: it went through a portal into another dimension, respawned far away, or was
# teleported. Start over at the bot: the old eye and the yaw marker go (in every dimension), the ride stops, the camera
# player is teleported to the bot (a teleport crosses dimensions), and the next lines of the tick make a new eye there
# and ask for the ride again. At most once every 2 s.
kill @e[type=minecraft:item_display,tag=muse_cam_eye]
kill @e[type=minecraft:marker,tag=muse_cam_yaw]
execute as @a[tag=muse_cam] run spectate
tag @a[tag=muse_cam] remove muse_cam_ineye
tag @a[tag=muse_cam] remove muse_cam_inhead
execute as @a[tag=muse_cam] at @a[tag=muse_cam_target,limit=1] run tp @s ~ ~2 ~
scoreboard players set #cd muse_cam_cd 40
