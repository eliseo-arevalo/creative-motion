import { Config } from '@remotion/cli/config';

// Captures (screenshots + manifest) live in captures/<sceneId>/ and are served as static files.
Config.setPublicDir('captures');
Config.setVideoImageFormat('png');
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);
