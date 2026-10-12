# one step of the orbit in its direction: the next angle on the orbit marker; a good spot there: the eye goes there
scoreboard players operation #oc muse_cam_y = #oa muse_cam_y
scoreboard players operation #oc muse_cam_y += #od muse_cam_y
scoreboard players operation #oc muse_cam_y += #3600 muse_cam_y
scoreboard players operation #oc muse_cam_y %= #3600 muse_cam_y
execute store result entity @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] Rotation[0] float 0.1 run scoreboard players get #oc muse_cam_y
execute as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^3.5 ^-5 run function muse_cam:good
execute if score #g muse_cam_y matches 1 run scoreboard players set #ok muse_cam_y 1
execute if score #ok muse_cam_y matches 1 run scoreboard players operation #oa muse_cam_y = #oc muse_cam_y
execute if score #ok muse_cam_y matches 1 run function muse_cam:to_spot
