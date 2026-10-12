# the orbit's ring: 8 angles from behind the bot (the camera's yaw), turning out both ways; the first good one starts
# the orbit there
scoreboard players set #rd muse_cam_y 0
function muse_cam:ring_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 450
execute if score #f muse_cam_y matches 0 run function muse_cam:ring_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y -450
execute if score #f muse_cam_y matches 0 run function muse_cam:ring_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 900
execute if score #f muse_cam_y matches 0 run function muse_cam:ring_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y -900
execute if score #f muse_cam_y matches 0 run function muse_cam:ring_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 1350
execute if score #f muse_cam_y matches 0 run function muse_cam:ring_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y -1350
execute if score #f muse_cam_y matches 0 run function muse_cam:ring_at
execute if score #f muse_cam_y matches 0 run scoreboard players set #rd muse_cam_y 1800
execute if score #f muse_cam_y matches 0 run function muse_cam:ring_at
