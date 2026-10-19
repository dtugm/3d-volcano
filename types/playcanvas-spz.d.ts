declare module "playcanvas/scripts/esm/parsers/spz-parser.mjs" {
  import type { GraphicsDevice, GSplatResourceBase } from "playcanvas";

  export class GSplatSpzResource extends GSplatResourceBase {
    constructor(device: GraphicsDevice, gsplatData: object, options?: { prepareCenters?: boolean });
  }
  export class SpzParser {
    constructor(app: unknown);
  }
}
