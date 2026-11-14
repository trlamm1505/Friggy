-- Drop unused Sponsor & AI Evaluation Log tables
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `campaign_recipes`;
DROP TABLE IF EXISTS `ingredient_purchase_links`;
DROP TABLE IF EXISTS `sponsor_campaigns`;
DROP TABLE IF EXISTS `sponsors`;
DROP TABLE IF EXISTS `ai_evaluation_logs`;

SET FOREIGN_KEY_CHECKS = 1;

