import { createOpenApiDomain } from "../_openapi/domain.js";
import { enrollmentsV2Config } from "./config.js";

export const enrollmentsV2Domain = createOpenApiDomain(enrollmentsV2Config);
