# one ring of muse_cam:near (#np), 8 directions
scoreboard players set #rd muse_cam_y 0
function muse_cam:near_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 450
execute if score #f muse_cam_y matches 0 run function muse_cam:near_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y -450
execute if score #f muse_cam_y matches 0 run function muse_cam:near_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 900
execute if score #f muse_cam_y matches 0 run function muse_cam:near_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y -900
execute if score #f muse_cam_y matches 0 run function muse_cam:near_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 1350
execute if score #f muse_cam_y matches 0 run function muse_cam:near_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y -1350
execute if score #f muse_cam_y matches 0 run function muse_cam:near_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 1800
execute if score #f muse_cam_y matches 0 run function muse_cam:near_at
