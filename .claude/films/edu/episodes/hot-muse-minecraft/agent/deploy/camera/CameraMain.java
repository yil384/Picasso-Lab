// deploy/camera/CameraMain.java - starts the vanilla Minecraft client with its access token from the environment
// (MC_ACCESS_TOKEN) instead of the command line: a process's arguments are readable by every user of the machine
// (/proc/<pid>/cmdline), its environment only by its own user. Everything else is passed through to
// net.minecraft.client.main.Main unchanged. Compiled in deploy/Dockerfile.camera; no Minecraft classes at compile time.
// In a package of its own: the client jar is signed and its obfuscated classes live in the default package, which an
// unsigned class there would break ("signer information does not match").

package muse.camera;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public final class CameraMain {
  private CameraMain() {}

  public static void main(String[] args) throws Throwable {
    String token = System.getenv("MC_ACCESS_TOKEN");
    List<String> all = new ArrayList<>(Arrays.asList(args));
    all.add("--accessToken");
    all.add(token == null || token.isBlank() ? "0" : token.trim());
    Class<?> main = Class.forName("net.minecraft.client.main.Main");
    try {
      main.getMethod("main", String[].class).invoke(null, (Object) all.toArray(new String[0]));
    } catch (java.lang.reflect.InvocationTargetException e) {
      throw e.getCause();
    }
  }
}
