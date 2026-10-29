import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Optional: a system Chrome/Chromium instead of the one Remotion downloads.
const browser = process.env.REMOTION_BROWSER_EXECUTABLE;
if (browser && existsSync(browser)) Config.setBrowserExecutable(browser);
