import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { automaticPaymentsV2BusinessRulesConfig } from "./config.js";

export const automaticPaymentsV2BusinessRulesDomain = createConfluenceSectionsDomain(
  automaticPaymentsV2BusinessRulesConfig
);
