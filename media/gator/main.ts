import { setup } from './render';

setup("diffuse-correct", require("./diffuse-correct.glsl"));
setup("diffuse-naive", require("./diffuse-naive.glsl"));
setup("diffuse-alltrans", require("./diffuse-alltrans.glsl"));
