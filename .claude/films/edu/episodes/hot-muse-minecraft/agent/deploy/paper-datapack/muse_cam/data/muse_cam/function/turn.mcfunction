# the orbit marker turned to the camera's yaw plus #rd (tenths of a degree): #oc
scoreboard players operation #oc muse_cam_y = #c muse_cam_y
scoreboard players operation #oc muse_cam_y += #rd muse_cam_y
scoreboard players operation #oc muse_cam_y += #3600 muse_cam_y
scoreboard players operation #oc muse_cam_y %= #3600 muse_cam_y
execute store result entity @e[type=minecraft:marker,tag=muse_cam_orbit,limit=1] Rotation[0] float 0.1 run scoreboard players get #oc muse_cam_y
