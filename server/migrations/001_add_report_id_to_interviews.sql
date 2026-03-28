-- Add report_id column to interviews table
-- Run this migration if the column does not exist

ALTER TABLE interviews ADD COLUMN report_id VARCHAR REFERENCES interview_reports(report_id);
