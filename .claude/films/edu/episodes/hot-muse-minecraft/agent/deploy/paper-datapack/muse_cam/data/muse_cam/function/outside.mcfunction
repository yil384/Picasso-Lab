# the bot is enclosed: look at its shelter from outside. Fixed directions (it turns about while it builds, and a spot
# that follows its yaw swings around it), each spot with open air below and above it (never resting on a roof or the
# ground), each line overwriting the one before, most preferred last: the bot's eyes (never inside a block), 4 and 7
# blocks straight above it, 4 back and up on a diagonal.
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~ ~ facing ^ ^ ^12
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~4 ~ if block ~ ~-1 ~ #muse_cam:open if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~7 ~ if block ~ ~-1 ~ #muse_cam:open if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~-3 ~4 ~-3 if block ~ ~-1 ~ #muse_cam:open if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open if block ~1 ~-1 ~1 #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
