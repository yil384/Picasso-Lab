# one angle of the ring: the camera's yaw turned by #rd tenths of a degree, 5 blocks out and 3.5 up
function muse_cam:turn
execute as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^3.5 ^-5 run function muse_cam:good
execute if score #g muse_cam_y matches 1 run scoreboard players operation #oa muse_cam_y = #oc muse_cam_y
execute if score #g muse_cam_y matches 1 run scoreboard players set #od muse_cam_y 3
execute if score #g muse_cam_y matches 1 run scoreboard players set #on muse_cam_y 1
execute if score #g muse_cam_y matches 1 run function muse_cam:to_spot
execute if score #g muse_cam_y matches 1 run scoreboard players set #f muse_cam_y 1
