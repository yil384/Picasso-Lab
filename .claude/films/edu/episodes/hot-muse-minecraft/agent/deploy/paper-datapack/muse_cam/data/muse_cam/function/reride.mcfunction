# the ride from scratch after a regroup: stopped here and asked for again by muse_cam:view later in the same tick. The
# server sends a ride only when it changes, and the client drops one on an entity it does not have yet: right after a
# dimension change it is still loading, so the first ride on the new eye is lost and the picture stands still where
# the camera was put (seen on staging, 2026-10-11)
execute as @a[tag=muse_cam] run spectate
tag @a[tag=muse_cam] remove muse_cam_ineye
tag @a[tag=muse_cam] remove muse_cam_inhead
