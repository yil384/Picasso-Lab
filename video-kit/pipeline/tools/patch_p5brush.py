#!/usr/bin/env python3
"""Make p5.brush 2.2.3's blend shader deterministic on real GPUs.

Upstream computes dFdx/dFdy (for the watercolour edge darkening) AFTER a per-fragment early
`return` (`if (maskColor.a == 0.0) {...; return;}`). Derivatives in non-uniform control flow are
undefined in GLSL, so on Metal/OpenGL the edge pixels of every fill came out slightly different
in each browser process (SwiftShader happened to be stable). The patch hoists the derivative
loop above the early return (it is only guarded by the uniform u_isBrush), which is the
well-defined version of the same maths.

    python3 tools/patch_p5brush.py   # writes vendor/p5.brush/p5.brush.pv.js
"""
import hashlib
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "vendor", "p5.brush", "p5.brush.js")
DST = os.path.join(ROOT, "vendor", "p5.brush", "p5.brush.pv.js")

OLD = ("vec4 maskColor=texture(u_mask,maskUV);if(maskColor.a==0.0){outColor=source;return;}"
       "vec4 pigment=vec4(u_color.xyz,1.0);")
NEW = ("vec4 maskColor=texture(u_mask,maskUV);"
       "float pvBlurEdge=0.0;if(!u_isBrush){vec2 pvTexel=1.0/vec2(textureSize(u_mask,0));"
       "for(int i=-2;i<=2;i+=2){for(int j=-2;j<=2;j+=2){"
       "float pvA=texture(u_mask,maskUV+vec2(float(i),float(j))*pvTexel).a*15.0;"
       "pvBlurEdge+=smoothstep(EDGE_MIN,EDGE_MAX,length(vec2(dFdx(pvA),dFdy(pvA))));}}pvBlurEdge/=9.0;}"
       "if(maskColor.a==0.0){outColor=source;return;}"
       "vec4 pigment=vec4(u_color.xyz,1.0);")
OLD2 = ("if(!u_isBrush){vec2 texelSize=1.0/vec2(textureSize(u_mask,0));float scaledAlpha=maskColor.a*15.0;"
        "float blurEdge=0.0;for(int i=-2;i<=2;i+=2){for(int j=-2;j<=2;j+=2){vec2 neighborUV=maskUV+vec2(float(i),"
        "float(j))*texelSize;float neighborAlpha=texture(u_mask,neighborUV).a*15.0;blurEdge+=smoothstep(EDGE_MIN,"
        "EDGE_MAX,length(vec2(dFdx(neighborAlpha),dFdy(neighborAlpha))));}}blurEdge/=9.0;"
        "mixIntensity=clamp(maskColor.a+blurEdge*0.1,0.0,1.0);}")
NEW2 = "if(!u_isBrush){mixIntensity=clamp(maskColor.a+pvBlurEdge*0.1,0.0,1.0);}"


def main():
    with open(SRC, encoding="utf-8") as f:
        s = f.read()
    for old, new in ((OLD, NEW), (OLD2, NEW2)):
        if s.count(old) != 1:
            print(f"ERROR: expected exactly one match for patch anchor, found {s.count(old)}", file=sys.stderr)
            return 1
        s = s.replace(old, new)
    s = "/* p5.brush 2.2.3 + pv determinism patch (tools/patch_p5brush.py) */\n" + s
    with open(DST, "w", encoding="utf-8") as f:
        f.write(s)
    print("wrote", DST, hashlib.sha256(s.encode()).hexdigest())
    return 0


if __name__ == "__main__":
    sys.exit(main())
