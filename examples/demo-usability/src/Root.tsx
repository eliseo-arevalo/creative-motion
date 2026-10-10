import React from 'react';
import { UsabilityComposition } from '@eliseo-arevalo/screen-kit';

// One generic composition; the scene is chosen with --props '{"sceneId":"demo"}' (default: demo).
export const Root: React.FC = () => <UsabilityComposition defaultSceneId="demo" />;
