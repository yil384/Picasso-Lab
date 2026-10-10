# a new eye at the bot's head, and the marker (server-only, never drawn) that holds the camera's smoothed yaw
kill @e[type=minecraft:marker,tag=muse_cam_yaw]
summon minecraft:item_display ~ ~1.6 ~ {Tags:["muse_cam_eye"],teleport_duration:3}
summon minecraft:marker ~ ~ ~ {Tags:["muse_cam_yaw"]}
execute store result score #c muse_cam_y run data get entity @a[tag=muse_cam_target,limit=1] Rotation[0] 10
