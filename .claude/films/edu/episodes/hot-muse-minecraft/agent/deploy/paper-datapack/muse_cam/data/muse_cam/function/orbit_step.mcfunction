# one step of the orbit in its direction: the next angle on the orbit marker; open air there: the eye goes there
scoreboard players operation #oc muse_cam_y = #oa muse_cam_y
scoreboard players operation #oc muse_cam_y += #od muse_cam_y
scoreboard players operation #oc muse_cam_y += #3600 muse_cam_y
scoreboard players operation #oc muse_cam_y %= #3600 muse_cam_y
execute store result entity @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] Rotation[0] float 0.1 run scoreboard players get #oc muse_cam_y
execute as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^3.5 ^-5 if block ~ ~ ~ #muse_cam:open if block ~ ~1 ~ #muse_cam:open if block ~ ~-1 ~ #muse_cam:open run scoreboard players set #ok muse_cam_y 1
execute if score #ok muse_cam_y matches 1 run scoreboard players operation #oa muse_cam_y = #oc muse_cam_y
execute if score #ok muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^3.5 ^-5 run tp @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] ~ ~ ~ facing entity @s eyes
