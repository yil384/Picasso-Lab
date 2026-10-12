# a view from high above, looking down at the shelter: 12 to 32 blocks straight up (a little to the side first), its
# line down through open air or leaves (a canopy is outside too)
scoreboard players set #lv muse_cam_y 1
execute as @a[tag=muse_cam_target,limit=1] at @s positioned ~3 ~10 ~3 run function muse_cam:good
execute if score #g muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~12 ~ run function muse_cam:good
execute if score #g muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~16 ~ run function muse_cam:good
execute if score #g muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~24 ~ run function muse_cam:good
execute if score #g muse_cam_y matches 0 as @a[tag=muse_cam_target,limit=1] at @s positioned ~ ~32 ~ run function muse_cam:good
execute if score #g muse_cam_y matches 1 run function muse_cam:to_spot
execute if score #g muse_cam_y matches 1 run scoreboard players set #on muse_cam_y 2
execute if score #g muse_cam_y matches 1 run scoreboard players set #hv muse_cam_y 1
execute if score #g muse_cam_y matches 1 run scoreboard players set #f muse_cam_y 1
scoreboard players set #lv muse_cam_y 0
