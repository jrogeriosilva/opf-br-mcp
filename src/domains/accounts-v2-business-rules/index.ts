import { createConfluenceSectionsDomain } from "../_confluence-sections/domain.js";
import { accountsV2BusinessRulesConfig } from "./config.js";

export const accountsV2BusinessRulesDomain = createConfluenceSectionsDomain(
  accountsV2BusinessRulesConfig
);
