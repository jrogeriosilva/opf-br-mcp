import { createOpenApiDomain } from "../_openapi/domain.js";
import { resourcesV3Config } from "./config.js";

export const resourcesV3Domain = createOpenApiDomain(resourcesV3Config);
