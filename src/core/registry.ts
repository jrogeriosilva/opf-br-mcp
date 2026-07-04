import type { Domain } from "./types.js";
import { pcmDomain } from "../domains/pcm-additional-info/index.js";
import { paymentsDomain } from "../domains/payments-openapi/index.js";

export const domains: Domain[] = [pcmDomain, paymentsDomain];
