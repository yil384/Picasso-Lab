# one spot of muse_cam:near: ring #np (3 out 2 up, 4 out 3 up, 3 out 4 up, 6 out 3 up, 6 out 5 up, 8 out 4 up) at #rd
function muse_cam:turn
scoreboard players set #g muse_cam_y 0
execute if score #np muse_cam_y matches 1 as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^2 ^-3 run function muse_cam:good
execute if score #np muse_cam_y matches 2 as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^3 ^-4 run function muse_cam:good
execute if score #np muse_cam_y matches 3 as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^4 ^-3 run function muse_cam:good
execute if score #np muse_cam_y matches 4 as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^3 ^-6 run function muse_cam:good
execute if score #np muse_cam_y matches 5 as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^5 ^-6 run function muse_cam:good
execute if score #np muse_cam_y matches 6 as @a[tag=muse_cam_target,limit=1] at @s rotated as @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] rotated ~ 0 positioned ^ ^4 ^-8 run function muse_cam:good
execute if score #g muse_cam_y matches 1 run function muse_cam:to_spot
execute if score #g muse_cam_y matches 1 run scoreboard players set #f muse_cam_y 1
