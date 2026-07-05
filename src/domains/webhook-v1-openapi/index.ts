import { createOpenApiDomain } from "../_openapi/domain.js";
import { webhookConfig } from "./config.js";

export const webhookDomain = createOpenApiDomain(webhookConfig);
