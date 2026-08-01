import type { Domain } from "./types.js";
import { pcmDomain } from "../domains/pcm-additional-info/index.js";
import { paymentsDomain } from "../domains/payments-v4-openapi/index.js";
import { paymentsV5Domain } from "../domains/payments-v5-openapi/index.js";
import { paymentsV5BusinessRulesDomain } from "../domains/payments-v5-business-rules/index.js";
import { enrollmentsV2Domain } from "../domains/enrollments-v2-openapi/index.js";
import { enrollmentsV2BusinessRulesDomain } from "../domains/enrollments-v2-business-rules/index.js";
import { automaticPaymentsV2Domain } from "../domains/automatic-payments-v2-openapi/index.js";
import { automaticPaymentsV2BusinessRulesDomain } from "../domains/automatic-payments-v2-business-rules/index.js";
import { paymentsCommonRulesDomain } from "../domains/payments-common-rules/index.js";
import { paymentsImplementationGuidesDomain } from "../domains/payments-implementation-guides/index.js";
import { consentsV3Domain } from "../domains/consents-v3-openapi/index.js";
import { resourcesV3Domain } from "../domains/resources-v3-openapi/index.js";
import { resourcesV3BusinessRulesDomain } from "../domains/resources-v3-business-rules/index.js";
import { accountsV2Domain } from "../domains/accounts-v2-openapi/index.js";
import { accountsV2BusinessRulesDomain } from "../domains/accounts-v2-business-rules/index.js";
import { pcmOpenapiDomain } from "../domains/pcm-openapi/index.js";
import { pcmBusinessRulesDomain } from "../domains/pcm-business-rules/index.js";
import { jornadaOtimizadaDomain } from "../domains/jornada-otimizada/index.js";
import { mqdDomain } from "../domains/mqd/index.js";
import { webhookDomain } from "../domains/webhook-v1-openapi/index.js";
import { segurancaDomain } from "../domains/seguranca/index.js";
import { participantesDomain } from "../domains/participantes/index.js";
import { portalDomain } from "../domains/portal/index.js";

export const domains: Domain[] = [
  pcmDomain,
  paymentsDomain,
  paymentsV5Domain,
  paymentsV5BusinessRulesDomain,
  enrollmentsV2Domain,
  enrollmentsV2BusinessRulesDomain,
  automaticPaymentsV2Domain,
  automaticPaymentsV2BusinessRulesDomain,
  paymentsCommonRulesDomain,
  paymentsImplementationGuidesDomain,
  consentsV3Domain,
  resourcesV3Domain,
  resourcesV3BusinessRulesDomain,
  accountsV2Domain,
  accountsV2BusinessRulesDomain,
  pcmOpenapiDomain,
  pcmBusinessRulesDomain,
  jornadaOtimizadaDomain,
  mqdDomain,
  webhookDomain,
  segurancaDomain,
  participantesDomain,
  portalDomain,
];
