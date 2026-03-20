insert into public.content_items (
  slug, title_working, pillar, content_type, source_asset_type, target_query,
  monetization_candidate, ebook_candidate, toolkit_candidate
)
values
('co16-explained', 'What does denial code CO-16 mean?', 'denials', 'education', 'denial_db', 'denial code CO-16', true, true, true),
('co4-explained', 'What does denial code CO-4 mean?', 'denials', 'education', 'denial_db', 'denial code CO-4', true, true, true),
('denial-next-steps', 'What to do after insurance denial', 'denials', 'action', 'seo_cluster', 'what to do after insurance denial', true, true, true),
('appeal-basics', 'How to appeal an insurance denial', 'denials', 'action', 'seo_cluster', 'how to appeal insurance denial', true, true, true),
('denial-mistakes', '3 mistakes people make after denial', 'denials', 'education', 'seo_cluster', 'insurance denial mistakes', true, true, true),
('appeal-deadline', 'Why your appeal deadline matters', 'denials', 'education', 'seo_cluster', 'appeal deadline insurance denial', true, true, true),
('what-is-eob', 'What an EOB actually tells you', 'denials', 'education', 'seo_cluster', 'what is an eob', true, true, true),
('itemized-bill', 'Ask for an itemized bill first', 'billing', 'action', 'seo_cluster', 'itemized hospital bill', true, false, true),
('bill-red-flags', '3 red flags in hospital bills', 'billing', 'education', 'seo_cluster', 'hospital bill errors', true, false, true),
('negotiate-bill', 'How to negotiate a hospital bill', 'billing', 'action', 'seo_cluster', 'negotiate hospital bill', true, true, true),
('billing-call-script', 'What to say on a billing call', 'billing', 'action', 'seo_cluster', 'hospital billing call script', true, false, true),
('dont-pay-first-bill', 'Don’t pay the first bill blindly', 'billing', 'education', 'seo_cluster', 'should i pay first hospital bill', true, false, true),
('billing-codes', 'What medical billing codes actually mean', 'billing', 'education', 'seo_cluster', 'medical billing codes explained', false, false, false),
('patient-rights', 'Patient rights people forget in the hospital', 'rights', 'education', 'rights_library', 'patient rights hospital', true, true, false),
('file-complaint', 'How to file a complaint against a hospital', 'rights', 'action', 'rights_library', 'file hospital complaint', true, true, true),
('ombudsman', 'What an ombudsman does', 'rights', 'education', 'rights_library', 'what does an ombudsman do', true, true, true),
('nursing-home-start', 'Nursing home concern? Start here', 'rights', 'action', 'rights_library', 'nursing home complaint help', true, true, true),
('system-confusing', 'Why the system feels confusing on purpose', 'founder', 'trust', 'founder_notes', null, false, true, false),
('people-exhausted', 'Most people give up because they’re exhausted', 'founder', 'trust', 'founder_notes', null, false, true, false),
('first-step', 'You do not need to understand everything to take the first step', 'founder', 'trust', 'founder_notes', null, false, true, false);