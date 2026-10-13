# over the right shoulder, looking where the bot looks (at a point 12 blocks ahead, 20 degrees down; an absolute aim, because a relative
# rotation in tp is relative to the entity's own since 1.21.2). Each line overwrites the one before
# when its spots are open air, so the last that fits wins, most preferred last: the bot's own eyes (never inside a
# block), straight above its head looking down (the middle of a shaft it digs), from above at an angle (a hole it dug
# in), then 2.3 and 3.2 blocks behind (nothing closer: the bot's face would fill the picture when it turns), each only while the bot
# is seen from it. A wall pulls the camera in instead of hiding the bot.
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~ ~ facing ^ ^ ^12
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run scoreboard players set #sr muse_cam_y 11
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @s rotated ~ 20 positioned ^ ^ ^0.3 if block ~ ~ ~ #muse_cam:open if block ^ ^ ^0.6 #muse_cam:open if block ^ ^ ^1.2 #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~ ~ facing ^ ^ ^12
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @s rotated ~ 20 positioned ^ ^ ^0.3 if block ~ ~ ~ #muse_cam:open if block ^ ^ ^0.6 #muse_cam:open if block ^ ^ ^1.2 #muse_cam:open run scoreboard players set #sr muse_cam_y 12
# a tunnel (a roof over the head, nothing open above): 1.9 blocks behind just under eye height, looking along it past the bot
# (22), before the bot's own view of the wall it mines (g0a414c: just ahead of its face, a wall of stone filled the
# picture; that spot now needs open air 1.2 blocks ahead)
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 if block ^-0.2 ^-0.1 ^-0.7 #muse_cam:open if block ^-0.3 ^-0.1 ^-1.3 #muse_cam:open if block ^-0.3 ^-0.1 ^-1.9 #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ^-0.3 ^-0.1 ^-1.9 facing ^ ^-1 ^12
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 0 if block ^-0.2 ^-0.1 ^-0.7 #muse_cam:open if block ^-0.3 ^-0.1 ^-1.3 #muse_cam:open if block ^-0.3 ^-0.1 ^-1.9 #muse_cam:open run scoreboard players set #sr muse_cam_y 22
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ if block ~ ~0.8 ~ #muse_cam:open if block ~ ~1.6 ~ #muse_cam:open run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~1.5 ~ facing entity @s feet
execute as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ if block ~ ~0.8 ~ #muse_cam:open if block ~ ~1.6 ~ #muse_cam:open run scoreboard players set #sr muse_cam_y 13
# the spots behind: 2.3 (14) and 3.2 blocks (15), whether the way to each is open and the bot is seen from it
function muse_cam:behind
# hidden (#hd 1): no spot behind has seen the bot for a second (a hole, a shaft, a burrow under leaves); seen again for a
# second, back behind it. A step down for a moment hides the bot's shoulders and changes nothing.
scoreboard players set #vis muse_cam_y 0
execute if score #p14 muse_cam_y matches 1 if score #v14 muse_cam_y matches 1 run scoreboard players set #vis muse_cam_y 1
execute if score #p15 muse_cam_y matches 1 if score #v15 muse_cam_y matches 1 run scoreboard players set #vis muse_cam_y 1
execute if score #vis muse_cam_y matches 1 run scoreboard players add #vc muse_cam_y 1
execute if score #vis muse_cam_y matches 1 run scoreboard players set #vb muse_cam_y 0
execute if score #vis muse_cam_y matches 0 run scoreboard players add #vb muse_cam_y 1
execute if score #vis muse_cam_y matches 0 run scoreboard players set #vc muse_cam_y 0
execute if score #vb muse_cam_y matches 20.. run scoreboard players set #hd muse_cam_y 1
execute if score #vc muse_cam_y matches 20.. run scoreboard players set #hd muse_cam_y 0
execute if score #vb muse_cam_y matches 100.. run scoreboard players set #vb muse_cam_y 100
execute if score #vc muse_cam_y matches 100.. run scoreboard players set #vc muse_cam_y 100
# no spot behind to take (hidden, or no way to one): a view from above at an angle (muse_cam:overhead), before straight
# down; the spots behind, when they are taken, come after and win
scoreboard players set #ov muse_cam_y 1
execute if score #hd muse_cam_y matches 0 if score #p14 muse_cam_y matches 1 run scoreboard players set #ov muse_cam_y 0
execute if score #hd muse_cam_y matches 0 if score #p15 muse_cam_y matches 1 run scoreboard players set #ov muse_cam_y 0
execute if score #ov muse_cam_y matches 1 run function muse_cam:overhead
execute if score #ov muse_cam_y matches 1 if score #ao muse_cam_y matches 16.. at @e[type=minecraft:marker,tag=muse_cam_try,limit=1] run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~ ~ facing entity @a[tag=muse_cam_target,limit=1] eyes
execute if score #ov muse_cam_y matches 1 if score #ao muse_cam_y matches 16.. run scoreboard players operation #sr muse_cam_y = #ao muse_cam_y
# not hidden: a spot behind, one that sees the bot first (the last line that fits wins: 15 seen, 14 seen, 15, 14)
execute if score #hd muse_cam_y matches 0 if score #p14 muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ^-0.5 ^0.45 ^-2.3 facing ^ ^ ^12
execute if score #hd muse_cam_y matches 0 if score #p14 muse_cam_y matches 1 run scoreboard players set #sr muse_cam_y 14
execute if score #hd muse_cam_y matches 0 if score #p15 muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ^-0.7 ^0.6 ^-3.2 facing ^ ^ ^12
execute if score #hd muse_cam_y matches 0 if score #p15 muse_cam_y matches 1 run scoreboard players set #sr muse_cam_y 15
execute if score #hd muse_cam_y matches 0 if score #p14 muse_cam_y matches 1 if score #v14 muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ^-0.5 ^0.45 ^-2.3 facing ^ ^ ^12
execute if score #hd muse_cam_y matches 0 if score #p14 muse_cam_y matches 1 if score #v14 muse_cam_y matches 1 run scoreboard players set #sr muse_cam_y 14
execute if score #hd muse_cam_y matches 0 if score #p15 muse_cam_y matches 1 if score #v15 muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s anchored eyes positioned ^ ^ ^ rotated as @e[type=minecraft:marker,tag=muse_cam_yaw,limit=1] rotated ~ 20 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ^-0.7 ^0.6 ^-3.2 facing ^ ^ ^12
execute if score #hd muse_cam_y matches 0 if score #p15 muse_cam_y matches 1 if score #v15 muse_cam_y matches 1 run scoreboard players set #sr muse_cam_y 15
# the evidence (muse_cam:note_new) of every change of the spot over the shoulder (11 its eyes, 12 just ahead, 13 above
# its head: a hole, a shaft, a burrow under leaves; 14 and 15 behind it; 16 to 21 from above at an angle; 22 behind it
# in a tunnel), at most once
# every 5 s
scoreboard players remove #nc muse_cam_y 1
execute if score #nc muse_cam_y matches ..0 unless score #sr muse_cam_y = #sl muse_cam_y run function muse_cam:note_shoulder
