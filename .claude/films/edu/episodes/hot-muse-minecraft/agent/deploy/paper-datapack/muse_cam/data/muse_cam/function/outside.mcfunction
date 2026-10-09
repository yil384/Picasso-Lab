# the bot is enclosed: look at its shelter from outside, the most preferred open spot last (each line overwrites): close
# behind its head (a tunnel underground), behind and above, straight above, farther behind and above
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated ~ 25 positioned ^ ^0.3 ^-1.2 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~ ~ facing entity @s eyes
execute as @a[tag=muse_cam_target,limit=1] at @s rotated ~ 0 positioned ^ ^3 ^-4 if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~6 ~ if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
execute as @a[tag=muse_cam_target,limit=1] at @s rotated ~ 0 positioned ^ ^4 ^-6 if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
