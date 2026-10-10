# the bot is enclosed: look at its shelter from outside, from high enough to show it in its place. Fixed directions
# (it turns about while it builds), each spot with open air two blocks below and one above, each line overwriting the
# one before, most preferred last: where the eye already is (it was behind the bot when the walls went up, so it is
# outside them), only turned to the bot; 7 and 10 blocks straight above it; 4 back and 7 up on a diagonal. Never into
# its head (the player model's face is drawn from within).
execute as @a[tag=muse_cam_target,limit=1] as @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] at @s run tp @s ~ ~ ~ facing entity @a[tag=muse_cam_target,limit=1] eyes
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~7 ~ if block ~ ~-2 ~ #muse_cam:open if block ~ ~-1 ~ #muse_cam:open if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~10 ~ if block ~ ~-2 ~ #muse_cam:open if block ~ ~-1 ~ #muse_cam:open if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~-4 ~7 ~-4 if block ~ ~-2 ~ #muse_cam:open if block ~ ~-1 ~ #muse_cam:open if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open if block ~1 ~-2 ~1 #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~0.5 ~ facing entity @s feet
