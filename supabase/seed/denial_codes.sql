INSERT INTO public.denial_codes (code, category, plain_language_explanation, recommended_action, source) VALUES
('CO-4',  'other',   'The service is inconsistent with the patient''s age.', 'Request a peer-to-peer review with the insurer and submit documentation of medical necessity.', 'CARC'),
('CO-11', 'other',   'The diagnosis is inconsistent with the procedure.', 'Submit a corrected claim with the accurate diagnosis code that supports the procedure.', 'CARC'),
('CO-16', 'other',   'Claim lacks information or has submission/billing errors.', 'Review the claim for missing fields and resubmit with complete information.', 'CARC'),
('CO-22', 'other',   'This care may be covered by another payer.', 'Coordinate benefits and submit to the correct primary payer first.', 'CARC'),
('CO-29', 'other',   'The time limit for filing the claim has expired.', 'Submit an appeal with documentation showing the filing was timely or that circumstances warranted an exception.', 'CARC'),
('CO-45', 'other',   'Charge exceeds the fee schedule or maximum allowable amount.', 'Verify the contracted rate and adjust billing accordingly. If out-of-network, consider an appeal for gap exceptions.', 'CARC'),
('CO-97', 'other',   'Payment is included in the allowance for another service or procedure.', 'Review bundling rules and determine if an unbundling appeal is appropriate.', 'CARC'),
('PR-1',  'other',   'Deductible amount — patient responsibility.', 'Verify the patient''s deductible balance and whether the deductible year has reset.', 'CARC'),
('PR-2',  'other',   'Coinsurance amount — patient responsibility.', 'Confirm the coinsurance percentage and verify the claim was processed at in-network rates.', 'CARC'),
('PR-3',  'other',   'Co-payment amount — patient responsibility.', 'Verify the correct co-pay amount for this service type under the patient''s plan.', 'CARC')
ON CONFLICT (code) DO NOTHING;
